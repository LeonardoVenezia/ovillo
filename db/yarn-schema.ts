import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { CountryCode } from "@/features/profile/countries";

import { user } from "./auth-schema";

/**
 * Base de lanas: marcas y lanas (spec §5.6 y tablas `yarn_brand` / `yarn`
 * de §6). Es un catálogo compartido: lo ven todas las personas, con o sin
 * sesión.
 *
 * - Las lanas de la siembra inicial nacen `aprobada`; las que propone la
 *   comunidad quedan `sin-revisar` y visibles con esa marca hasta que las
 *   aprueba un moderador (panel de moderación, Fase 8).
 * - La composición se guarda como JSON (`[{ fiber, percent }]`) tal como la
 *   define §6: es un detalle de la lana, no una relación aparte.
 * - Los nombres de grosor son los de la clasificación estándar (lace,
 *   fingering…); las equivalencias en español se muestran desde
 *   `messages/es.ts`, no se guardan.
 * - `needle_mm` de §6 se guarda como rango (`needle_mm_min` / `needle_mm_max`):
 *   las etiquetas siempre recomiendan un rango, y un rango se valida y se
 *   muestra mejor que un texto libre (D-038).
 */

export const YARN_WEIGHTS = [
  "lace",
  "fingering",
  "sport",
  "dk",
  "worsted",
  "aran",
  "bulky",
  "super-bulky",
] as const;

export type YarnWeight = (typeof YARN_WEIGHTS)[number];

export function isYarnWeight(value: string): value is YarnWeight {
  return (YARN_WEIGHTS as readonly string[]).includes(value);
}

export const YARN_FIBERS = [
  "lana",
  "merino",
  "alpaca",
  "mohair",
  "cashmere",
  "angora",
  "yak",
  "seda",
  "algodon",
  "lino",
  "bambu",
  "canamo",
  "acrilico",
  "poliamida",
  "poliester",
  "viscosa",
  "elastano",
  "otra",
] as const;

export type YarnFiber = (typeof YARN_FIBERS)[number];

export function isYarnFiber(value: string): value is YarnFiber {
  return (YARN_FIBERS as readonly string[]).includes(value);
}

/** Una fibra de la composición con su porcentaje. */
export type FiberPart = {
  fiber: YarnFiber;
  percent: number;
};

export const YARN_STATUSES = ["sin-revisar", "aprobada"] as const;

export type YarnStatus = (typeof YARN_STATUSES)[number];

export function isYarnStatus(value: string): value is YarnStatus {
  return (YARN_STATUSES as readonly string[]).includes(value);
}

export const yarnBrand = pgTable(
  "yarn_brand",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    /** País de la marca (ISO 3166-1 alfa-2); puede faltar. */
    country: text("country").$type<CountryCode>(),
    /** Quién la agregó, si vino de una propuesta de la comunidad. */
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("yarn_brand_name_idx").on(table.name)],
);

export const yarn = pgTable(
  "yarn",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    brandId: text("brand_id")
      .notNull()
      .references(() => yarnBrand.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    /** Slug único dentro de la marca: la ficha vive en `/lanas/marca/slug`. */
    slug: text("slug").notNull(),
    weight: text("weight").$type<YarnWeight>().notNull(),
    fiber: jsonb("fiber").$type<FiberPart[]>().notNull().default([]),
    /** Metros y gramos del ovillo, tal como los nombra §6. */
    meters: integer("meters"),
    grams: integer("grams"),
    needleMmMin: numeric("needle_mm_min", {
      precision: 4,
      scale: 2,
      mode: "number",
    }),
    needleMmMax: numeric("needle_mm_max", {
      precision: 4,
      scale: 2,
      mode: "number",
    }),
    status: text("status").$type<YarnStatus>().notNull().default("sin-revisar"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Detección de duplicados (§5.6): el mismo nombre sin distinguir
    // mayúsculas ni acentos no se repite dentro de una marca. Los nombres de
    // índice no pueden chocar con los que crean las restricciones (`slug`
    // usa `yarn_brand_slug_unique`): por eso terminan en `_per_brand`.
    uniqueIndex("yarn_name_per_brand_unique").on(
      table.brandId,
      sql`translate(lower(${table.name}), 'áéíóúüñ', 'aeiouun')`,
    ),
    uniqueIndex("yarn_slug_per_brand_unique").on(table.brandId, table.slug),
    index("yarn_weight_idx").on(table.weight),
    index("yarn_brand_id_idx").on(table.brandId),
  ],
);

export const yarnBrandRelations = relations(yarnBrand, ({ many, one }) => ({
  yarns: many(yarn),
  creator: one(user, {
    fields: [yarnBrand.createdBy],
    references: [user.id],
  }),
}));

export const yarnRelations = relations(yarn, ({ one }) => ({
  brand: one(yarnBrand, {
    fields: [yarn.brandId],
    references: [yarnBrand.id],
  }),
  creator: one(user, {
    fields: [yarn.createdBy],
    references: [user.id],
  }),
}));
