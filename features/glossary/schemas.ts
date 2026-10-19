import { GLOSSARY_KINDS, type GlossaryKind } from "@/db/glossary-schema";
import { normalizeText } from "@/lib/slug";
import { es } from "@/messages/es";

import type { GlossaryTermView } from "./queries";

/**
 * Reglas puras del glosario (spec §5.14): qué técnicas se pueden filtrar,
 * cómo se busca un término (sin acentos ni mayúsculas, también por
 * abreviatura, en inglés y por variantes de cada país) y cómo se cuenta.
 *
 * La búsqueda mira todo lo que la persona podría recordar del término: el
 * nombre, cómo se abrevia, cómo se dice en inglés, su definición y las
 * variantes por país. Así "jersey" y "liso" llegan al mismo punto.
 */

/** Técnicas filtrables: `ambos` no es filtro, siempre acompaña. */
export const GLOSSARY_FILTER_CRAFTS = ["dos-agujas", "crochet"] as const;

export type GlossaryFilterCraft = (typeof GLOSSARY_FILTER_CRAFTS)[number];

export function parseGlossaryCraft(value: string): GlossaryFilterCraft | null {
  return value === "dos-agujas" || value === "crochet" ? value : null;
}

export type GlossaryFilters = {
  q: string;
  /** `null` = todas las técnicas. */
  craft: GlossaryFilterCraft | null;
};

function searchable(term: GlossaryTermView): string {
  return normalizeText(
    [
      term.term,
      term.abbreviation,
      term.english,
      term.definition,
      ...term.variants.map((variant) => `${variant.name} ${variant.country}`),
    ].join(" "),
  );
}

/** Filtra la lista del glosario respetando el orden recibido. */
export function filterGlossaryTerms(
  terms: GlossaryTermView[],
  filters: GlossaryFilters,
): GlossaryTermView[] {
  const q = normalizeText(filters.q).slice(0, 60);
  return terms.filter(
    (term) =>
      (filters.craft === null ||
        term.craft === filters.craft ||
        term.craft === "ambos") &&
      (q.length === 0 || searchable(term).includes(q)),
  );
}

/** Agrupa en secciones por tipo (puntos y técnicas), sin secciones vacías. */
export function groupGlossaryTerms(
  terms: GlossaryTermView[],
): { kind: GlossaryKind; terms: GlossaryTermView[] }[] {
  return GLOSSARY_KINDS.map((kind) => ({
    kind,
    terms: terms.filter((term) => term.kind === kind),
  })).filter((section) => section.terms.length > 0);
}

export function glossaryCountLabel(count: number): string {
  return count === 1
    ? es.glossary.countOne
    : es.glossary.count.replace("{count}", String(count));
}
