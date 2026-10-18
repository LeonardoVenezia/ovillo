import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { image } from "./media-schema";
import type { ProfileVisibility } from "./profile-schema";
import { project } from "./project-schema";
import { yarn, type YarnWeight } from "./yarn-schema";

/**
 * Inventario de lana (spec §5.7 y tablas `stash_item` / `project_yarn` de §6).
 *
 * - `stash_item` es la lana que alguien tiene en casa: vinculada al catálogo
 *   (`yarn_id`) o de carga libre (`custom_name`). La cantidad se guarda en
 *   ovillos y/o gramos, con los metros totales calculados; la **disponible**
 *   nunca se guarda: se calcula como total − asignada a proyectos activos.
 * - `project_yarn` es la lana que un proyecto está usando. Asignar no muta el
 *   inventario: la resta es la consulta (por eso frogear un proyecto devuelve
 *   la cantidad sola, spec §5.3). Al borrar una lana del inventario, sus
 *   asignaciones se van con ella (cascade).
 *
 * Extensiones sobre §6, anotadas en D-046: `color_family` (familia de color
 * para la grilla y los filtros), `weight` (grosor solo para cargas libres; si
 * está vinculada al catálogo, el grosor es el de la lana) y `image_id` (una
 * foto opcional por lana, en R2 como el resto de las fotos).
 */

export const COLOR_FAMILIES = [
  "rojo",
  "rosa",
  "naranja",
  "amarillo",
  "verde",
  "azul",
  "violeta",
  "marron",
  "gris",
  "negro",
  "blanco",
  "multicolor",
  "otro",
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export function isColorFamily(value: string): value is ColorFamily {
  return (COLOR_FAMILIES as readonly string[]).includes(value);
}

export const stashItem = pgTable(
  "stash_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Lana del catálogo; `null` en las cargas libres. */
    yarnId: text("yarn_id").references(() => yarn.id, {
      onDelete: "set null",
    }),
    /** Nombre propio de una carga libre (spec §6: `custom_name`). */
    customName: text("custom_name"),
    /** Color tal como lo dice la etiqueta ("Rojo coral"). */
    colorway: text("colorway"),
    /** Familia de color para la grilla y los filtros rápidos (D-046). */
    colorFamily: text("color_family").$type<ColorFamily>(),
    /** Grosor solo en cargas libres; en las vinculadas se usa el del catálogo. */
    weight: text("weight").$type<YarnWeight>(),
    dyeLot: text("dye_lot"),
    /** Cantidades: ovillos y/o gramos; los metros se calculan (spec §5.7). */
    skeins: integer("skeins"),
    grams: integer("grams"),
    metersTotal: integer("meters_total"),
    location: text("location"),
    notes: text("notes"),
    /** Privada por defecto (spec §5.7); la superficie pública llega después. */
    visibility: text("visibility")
      .$type<ProfileVisibility>()
      .notNull()
      .default("privado"),
    /** Foto opcional de la lana (en R2, como todas las fotos). */
    imageId: text("image_id").references(() => image.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("stash_item_user_idx").on(table.userId, table.createdAt),
    index("stash_item_user_weight_idx").on(table.userId, table.weight),
    index("stash_item_user_color_idx").on(table.userId, table.colorFamily),
  ],
);

export const projectYarn = pgTable(
  "project_yarn",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    /** Lana del inventario (la que descuenta disponible). */
    stashItemId: text("stash_item_id").references(() => stashItem.id, {
      onDelete: "cascade",
    }),
    /** Lana del catálogo cuando no sale del inventario (spec §6). */
    yarnId: text("yarn_id").references(() => yarn.id, {
      onDelete: "set null",
    }),
    skeinsUsed: integer("skeins_used"),
    gramsUsed: integer("grams_used"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_yarn_project_idx").on(table.projectId),
    index("project_yarn_stash_idx").on(table.stashItemId),
    // Una fila por lana del inventario en cada proyecto. Parcial: las filas
    // sin `stash_item_id` (lana del catálogo) no participan.
    uniqueIndex("project_yarn_project_stash_unique")
      .on(table.projectId, table.stashItemId)
      .where(sql`stash_item_id is not null`),
  ],
);

export const stashItemRelations = relations(stashItem, ({ one }) => ({
  user: one(user, {
    fields: [stashItem.userId],
    references: [user.id],
  }),
  yarn: one(yarn, {
    fields: [stashItem.yarnId],
    references: [yarn.id],
  }),
  image: one(image, {
    fields: [stashItem.imageId],
    references: [image.id],
  }),
}));

export const projectYarnRelations = relations(projectYarn, ({ one }) => ({
  project: one(project, {
    fields: [projectYarn.projectId],
    references: [project.id],
  }),
  stashItem: one(stashItem, {
    fields: [projectYarn.stashItemId],
    references: [stashItem.id],
  }),
  yarn: one(yarn, {
    fields: [projectYarn.yarnId],
    references: [yarn.id],
  }),
}));
