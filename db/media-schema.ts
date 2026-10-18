import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { project } from "./project-schema";

/**
 * Fotos y diario de avance (spec §5.3 y §6).
 *
 * Todas las fotos del sitio pasan por `image` (spec §6): guarda la clave del
 * objeto en R2 (y su miniatura), medidas y texto alternativo. `project_photo`
 * es la galería de un proyecto (hasta 20, con orden y portada) y
 * `project_entry` el diario de avance (fecha, texto corto y fotos).
 *
 * Las imágenes se comprimen en el navegador antes de subir y el servidor
 * aplica topes duros (features/projects/media-schemas.ts): los 10 GB
 * gratuitos de R2 alcanzan para decenas de miles de fotos.
 */

export const image = pgTable("image", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** Objeto en R2; la miniatura es la misma clave con sufijo `-thumb`. */
  r2Key: text("r2_key").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  /** Reservado por la spec §6; se completa en una próxima pasada. */
  blurhash: text("blurhash"),
  altText: text("alt_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectPhoto = pgTable(
  "project_photo",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    imageId: text("image_id")
      .notNull()
      .references(() => image.id, { onDelete: "cascade" }),
    /** Orden dentro de la galería (0 = primera). */
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("project_photo_project_image_idx").on(
      table.projectId,
      table.imageId,
    ),
    index("project_photo_project_position_idx").on(
      table.projectId,
      table.position,
    ),
  ],
);

export const projectEntry = pgTable(
  "project_entry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    /** Fecha que se muestra en el diario (elegible; por defecto hoy). */
    entryDate: date("entry_date").notNull(),
    body: text("body").notNull().default(""),
    /** Fotos de la entrada, en orden (ids de `image`). */
    imageIds: jsonb("image_ids")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Para el feed (Fase 7); hoy siempre apagado. */
    shareToFeed: boolean("share_to_feed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_entry_project_date_idx").on(
      table.projectId,
      table.entryDate,
    ),
  ],
);
