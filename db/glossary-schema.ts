import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/**
 * Glosario de puntos, abreviaturas y técnicas (spec §5.14 y tabla
 * `glossary_term` de §6).
 *
 * Decisiones (D-057):
 * - Un término guarda su nombre habitual, la abreviatura con la que aparece
 *   en los patrones, su equivalente en inglés (para leer patrones de afuera)
 *   y las variantes por país, que es lo que más confunde al empezar.
 * - `craft` dice para qué técnica sirve el término (`ambos` cuando vale para
 *   las dos) y `kind` separa los puntos de las técnicas.
 * - El contenido base lo siembra Ovillo (~dos agujas, crochet y comunes) y
 *   la edición por moderadores llega con el panel de la Fase 8 (D-057).
 */

export const GLOSSARY_CRAFTS = ["dos-agujas", "crochet", "ambos"] as const;

export type GlossaryCraft = (typeof GLOSSARY_CRAFTS)[number];

export function isGlossaryCraft(value: string): value is GlossaryCraft {
  return (GLOSSARY_CRAFTS as readonly string[]).includes(value);
}

export const GLOSSARY_KINDS = ["punto", "tecnica"] as const;

export type GlossaryKind = (typeof GLOSSARY_KINDS)[number];

export function isGlossaryKind(value: string): value is GlossaryKind {
  return (GLOSSARY_KINDS as readonly string[]).includes(value);
}

export const GLOSSARY_TERM_MAX = 80;
export const GLOSSARY_DEFINITION_MAX = 600;
export const GLOSSARY_VARIANTS_MAX = 6;

/** Cómo se dice el mismo término en otro país ("En España: punto liso"). */
export type GlossaryVariant = { country: string; name: string };

export const glossaryTerm = pgTable(
  "glossary_term",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    /** Slug global único: la URL pública es `/glosario#slug`. */
    slug: text("slug").notNull(),
    term: text("term").notNull(),
    /** Abreviatura de los patrones ("pd", "2pj", "sc"…); vacío si no hay. */
    abbreviation: text("abbreviation").notNull().default(""),
    /** Equivalente en inglés ("knit", "k2tog", "single crochet"…). */
    english: text("english").notNull().default(""),
    /** Variantes por país de la misma cosa (máximo 6). */
    variants: jsonb("variants")
      .$type<GlossaryVariant[]>()
      .notNull()
      .default([]),
    definition: text("definition").notNull(),
    craft: text("craft").$type<GlossaryCraft>().notNull().default("ambos"),
    kind: text("kind").$type<GlossaryKind>().notNull().default("punto"),
    /** Quien lo propuso, si no nació del contenido base de Ovillo. */
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
    uniqueIndex("glossary_term_slug_unique").on(table.slug),
    index("glossary_term_craft_idx").on(table.craft, table.kind),
  ],
);

export const glossaryTermRelations = relations(glossaryTerm, ({ one }) => ({
  creator: one(user, {
    fields: [glossaryTerm.createdBy],
    references: [user.id],
  }),
}));
