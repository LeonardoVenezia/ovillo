import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { Craft } from "@/features/profile/constants";

import { user } from "./auth-schema";
import type { YarnWeight } from "./yarn-schema";

/**
 * Biblioteca de patrones (spec §5.5 y tabla `pattern` de §6).
 *
 * - Es un catálogo compartido: lo ve cualquiera, con o sin sesión.
 * - Los patrones de la siembra inicial nacen `aprobada`; los que suma la
 *   comunidad quedan `sin-revisar` y visibles con esa marca hasta que los
 *   aprueba un moderador (panel de moderación, Fase 8).
 * - `source_url` es obligatorio por ahora: todo patrón se enlaza a donde
 *   está publicado (marca, blog, Ravelry…). `pdf_url` queda reservado para
 *   cuando Ovillo pueda alojar archivos propios (D-040).
 * - `craft` reutiliza el vocabulario de técnicas del perfil (`dos-agujas`,
 *   `crochet`, `telar`, `otras`); `yarn_weight` reutiliza los grosores del
 *   catálogo de lanas. Las etiquetas en español se muestran desde
 *   `messages/es.ts`, no se guardan.
 * - `search_vector` es la columna `tsvector` de §6, generada por Postgres en
 *   español a partir del nombre y del diseñador; el buscador la usa con su
 *   índice GIN y un cotejo sin acentos como respaldo (D-040).
 */

/** Columna `tsvector`: Drizzle no trae el tipo y guarda el texto indexado. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const PATTERN_CATEGORIES = [
  "prendas",
  "accesorios",
  "hogar",
  "bebes",
  "amigurumi",
  "mascotas",
  "otros",
] as const;

export type PatternCategory = (typeof PATTERN_CATEGORIES)[number];

export function isPatternCategory(value: string): value is PatternCategory {
  return (PATTERN_CATEGORIES as readonly string[]).includes(value);
}

export const PATTERN_LANGUAGES = ["es", "en", "pt", "otro"] as const;

export type PatternLanguage = (typeof PATTERN_LANGUAGES)[number];

export function isPatternLanguage(value: string): value is PatternLanguage {
  return (PATTERN_LANGUAGES as readonly string[]).includes(value);
}

export const PATTERN_STATUSES = ["sin-revisar", "aprobada"] as const;

export type PatternStatus = (typeof PATTERN_STATUSES)[number];

export function isPatternStatus(value: string): value is PatternStatus {
  return (PATTERN_STATUSES as readonly string[]).includes(value);
}

/** La dificultad que muestra la ficha (spec §5.5): de 1 (muy fácil) a 5. */
export type PatternDifficulty = 1 | 2 | 3 | 4 | 5;

export const pattern = pgTable(
  "pattern",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    /** Slug único global: la ficha vive en `/patrones/slug`. */
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** Diseñador/a como cuenta de Ovillo, si es parte de la comunidad. */
    designerUserId: text("designer_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    /** Diseñador/a como texto libre (marca, blog, @usuario…). */
    designerName: text("designer_name"),
    craft: text("craft").$type<Craft>(),
    category: text("category").$type<PatternCategory>().notNull(),
    /** 1–5; `null` = sin decir. */
    difficulty: integer("difficulty"),
    yarnWeight: text("yarn_weight").$type<YarnWeight>(),
    /** Metraje estimado en metros; `null` = sin decir. */
    yardageMin: integer("yardage_min"),
    yardageMax: integer("yardage_max"),
    /** Texto libre: las agujas o el ganchillo que pide el patrón. */
    needleSizes: text("needle_sizes"),
    /** Galga como texto libre ("20 puntos × 26 vueltas = 10 cm"). */
    gauge: text("gauge"),
    /** Tallas disponibles, como texto libre ("S a XL"). */
    sizes: text("sizes"),
    language: text("language").$type<PatternLanguage>().notNull().default("es"),
    /** Dónde vive el patrón (marca, blog, Ravelry…). Obligatorio por ahora. */
    sourceUrl: text("source_url").notNull(),
    /** PDF propio alojado por Ovillo (reservado, D-040). */
    pdfUrl: text("pdf_url"),
    /** Reservado: por ahora todos los patrones del catálogo son gratuitos. */
    isFree: boolean("is_free").notNull().default(true),
    status: text("status")
      .$type<PatternStatus>()
      .notNull()
      .default("sin-revisar"),
    /** Texto indexado del buscador (spec §6): nombre + diseñador/a. */
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('spanish', "name" || ' ' || coalesce("designer_name", ''))`,
    ),
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
    // Buscador (§5.5): el índice GIN del `tsvector` en español.
    index("pattern_search_gin").using("gin", table.searchVector),
    index("pattern_category_idx").on(table.category),
    check(
      "pattern_difficulty_check",
      sql`${table.difficulty} is null or (${table.difficulty} between 1 and 5)`,
    ),
  ],
);

export const patternRelations = relations(pattern, ({ one }) => ({
  creator: one(user, {
    fields: [pattern.createdBy],
    references: [user.id],
    relationName: "patternCreator",
  }),
  designer: one(user, {
    fields: [pattern.designerUserId],
    references: [user.id],
    relationName: "patternDesigner",
  }),
}));
