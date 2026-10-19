import { asc } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/db";
import {
  glossaryTerm,
  type GlossaryCraft,
  type GlossaryKind,
  type GlossaryVariant,
} from "@/db/glossary-schema";
import { normalizeText } from "@/lib/slug";

/**
 * Lecturas del glosario (spec §5.14).
 *
 * Es contenido público compartido que no cambia con quien mira, así que va
 * con `"use cache"` + `cacheLife("hours")` y se invalida con
 * `updateTag("glosario")` cuando la moderación lo edite (Fase 8, D-057). La
 * búsqueda y los filtros se hacen en memoria sobre esta lista.
 */

export type GlossaryTermView = {
  slug: string;
  term: string;
  abbreviation: string;
  english: string;
  variants: GlossaryVariant[];
  definition: string;
  craft: GlossaryCraft;
  kind: GlossaryKind;
};

/**
 * Todos los términos, ordenados alfabéticamente con criterio en español
 * (`localeCompare("es")`: la `ñ` va después de la `n`).
 */
export async function listGlossaryTerms(): Promise<GlossaryTermView[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("glosario");

  const rows = await getDb()
    .select({
      slug: glossaryTerm.slug,
      term: glossaryTerm.term,
      abbreviation: glossaryTerm.abbreviation,
      english: glossaryTerm.english,
      variants: glossaryTerm.variants,
      definition: glossaryTerm.definition,
      craft: glossaryTerm.craft,
      kind: glossaryTerm.kind,
    })
    .from(glossaryTerm)
    .orderBy(asc(glossaryTerm.term));

  return rows.sort((a, b) =>
    normalizeText(a.term).localeCompare(normalizeText(b.term), "es"),
  );
}
