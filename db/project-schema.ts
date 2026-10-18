import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { image } from "./media-schema";
import { pattern } from "./pattern-schema";
import type { ProfileVisibility } from "./profile-schema";

/**
 * Proyectos (spec §5.3 y tabla `project` de §6).
 *
 * El corazón de Ovillo: cada proyecto guarda qué se teje, en qué estado está
 * y todos los detalles opcionales. El borrado es lógico (`deleted_at`) y el
 * slug es único por persona, porque la URL pública es `/@usuario/proyectos/x`.
 *
 * Las fotos y el diario viven en `media-schema.ts`; los contadores llegan en
 * el próximo tramo de la fase.
 */

export const PROJECT_STATUSES = [
  "tejiendo",
  "en-pausa",
  "terminado",
  "frogueado",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

export const project = pgTable(
  "project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Slug único por persona; cambia nunca (la URL queda estable). */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Técnica como slug en español (mismo vocabulario que el perfil). */
    craft: text("craft"),
    status: text("status").$type<ProjectStatus>().notNull().default("tejiendo"),
    /** Progreso manual 0–100 (spec §5.3); `null` = sin barrita. */
    progress: integer("progress"),
    /** Patrón de la biblioteca que sigue el proyecto (spec §5.3). */
    patternId: text("pattern_id").references(() => pattern.id, {
      onDelete: "set null",
    }),
    /** Patrón como texto libre o enlace (cuando no está en la biblioteca). */
    patternText: text("pattern_text"),
    size: text("size"),
    madeFor: text("made_for"),
    startedAt: date("started_at"),
    /** Lo completa el servidor al marcar el proyecto como terminado. */
    finishedAt: date("finished_at"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    notes: text("notes"),
    visibility: text("visibility")
      .$type<ProfileVisibility>()
      .notNull()
      .default("publico"),
    /** Portada elegida de la galería (spec §6); `null` si todavía no hay. */
    coverImageId: text("cover_image_id").references(() => image.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("project_user_slug_idx").on(table.userId, table.slug),
    index("project_user_created_idx").on(table.userId, table.createdAt),
    // Galería "hechos por la comunidad" (spec §5.5): proyectos por patrón.
    index("project_pattern_idx").on(table.patternId),
  ],
);

export const projectRelations = relations(project, ({ one }) => ({
  user: one(user, {
    fields: [project.userId],
    references: [user.id],
  }),
}));
