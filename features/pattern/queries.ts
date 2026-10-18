import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/db";
import { user } from "@/db/auth-schema";
import {
  isPatternCategory,
  pattern,
  type PatternCategory,
  type PatternLanguage,
  type PatternStatus,
} from "@/db/pattern-schema";
import { isYarnWeight, type YarnWeight } from "@/db/yarn-schema";
import { isCraft, type Craft } from "@/features/profile/constants";
import { normalizeText } from "@/lib/slug";

/**
 * Consultas de la biblioteca de patrones (spec §5.5).
 *
 * Son datos públicos compartidos, así que van con `"use cache"` +
 * `cacheLife("hours")` y se invalidan desde las acciones con
 * `updateTag("patrones")` (misma receta que el catálogo de lanas, D-039).
 * Las entradas cacheadas nacen en la primera petición, nunca en el build:
 * el build de CI no tiene secretos de base.
 *
 * El buscador combina el `tsvector` en español de §6 (con su índice GIN)
 * con el cotejo sin mayúsculas ni acentos de respaldo, para que "sinfonia"
 * encuentre "Sinfonía" aunque el diccionario no ayude.
 */

/** Filtros del listado; todos opcionales y ya validados por quien llama. */
export type PatternFilters = {
  q?: string;
  /** Slug de técnica (`dos-agujas`, `crochet`, `telar`, `otras`). */
  craft?: string;
  category?: string;
  /** Dificultad 1–5, como texto de la URL. */
  difficulty?: string;
  weight?: string;
};

export type PatternListItem = {
  id: string;
  slug: string;
  name: string;
  designerName: string | null;
  craft: Craft | null;
  category: PatternCategory;
  difficulty: number | null;
  yarnWeight: YarnWeight | null;
  status: PatternStatus;
};

export type PatternDetail = PatternListItem & {
  language: PatternLanguage;
  sourceUrl: string;
  yardageMin: number | null;
  yardageMax: number | null;
  needleSizes: string | null;
  gauge: string | null;
  sizes: string | null;
  createdBy: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
};

const patternColumns = {
  id: pattern.id,
  slug: pattern.slug,
  name: pattern.name,
  designerName: pattern.designerName,
  craft: pattern.craft,
  category: pattern.category,
  difficulty: pattern.difficulty,
  yarnWeight: pattern.yarnWeight,
  status: pattern.status,
};

/** Escapa los comodines de LIKE: una búsqueda siempre es texto literal. */
function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

/** Dificultad válida de la URL, o `null` para no filtrar. */
export function parseDifficulty(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }
  return parsed;
}

/**
 * Patrones de la biblioteca, de los más nuevos a los más viejos. Incluye los
 * `sin-revisar` (spec §5.5: la propuesta queda visible al instante), marcados
 * en la interfaz.
 */
export async function listPatterns(
  filters: PatternFilters = {},
): Promise<PatternListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("patrones");

  const conditions = [];

  const query = normalizeText(filters.q ?? "").slice(0, 80);
  if (query.length > 0) {
    const like = likePattern(query);
    conditions.push(
      or(
        sql`${pattern.searchVector} @@ websearch_to_tsquery('spanish', ${query})`,
        ilike(
          sql`translate(lower(${pattern.name}), 'áéíóúüñ', 'aeiouun')`,
          like,
        ),
        ilike(
          sql`translate(lower(coalesce(${pattern.designerName}, '')), 'áéíóúüñ', 'aeiouun')`,
          like,
        ),
      ),
    );
  }
  if (filters.craft && isCraft(filters.craft)) {
    conditions.push(eq(pattern.craft, filters.craft));
  }
  if (filters.category && isPatternCategory(filters.category)) {
    conditions.push(eq(pattern.category, filters.category));
  }
  const difficulty = filters.difficulty
    ? parseDifficulty(filters.difficulty)
    : null;
  if (difficulty !== null) {
    conditions.push(eq(pattern.difficulty, difficulty));
  }
  if (filters.weight && isYarnWeight(filters.weight)) {
    conditions.push(eq(pattern.yarnWeight, filters.weight));
  }

  return getDb()
    .select(patternColumns)
    .from(pattern)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(pattern.createdAt), asc(pattern.name));
}

/** Un patrón por su slug (`/patrones/slug`). */
export async function getPatternBySlug(
  slug: string,
): Promise<PatternDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("patrones", `patron:${slug}`);

  const rows = await getDb()
    .select({
      ...patternColumns,
      language: pattern.language,
      sourceUrl: pattern.sourceUrl,
      yardageMin: pattern.yardageMin,
      yardageMax: pattern.yardageMax,
      needleSizes: pattern.needleSizes,
      gauge: pattern.gauge,
      sizes: pattern.sizes,
      createdBy: pattern.createdBy,
      creatorName: user.name,
      creatorUsername: user.username,
    })
    .from(pattern)
    .leftJoin(user, eq(pattern.createdBy, user.id))
    .where(eq(pattern.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

/** Patrón propio por id (para editar): autorización en un solo lugar. */
export async function getOwnPattern(
  userId: string,
  patternId: string,
): Promise<PatternDetail | null> {
  const rows = await getDb()
    .select({
      ...patternColumns,
      language: pattern.language,
      sourceUrl: pattern.sourceUrl,
      yardageMin: pattern.yardageMin,
      yardageMax: pattern.yardageMax,
      needleSizes: pattern.needleSizes,
      gauge: pattern.gauge,
      sizes: pattern.sizes,
      createdBy: pattern.createdBy,
      creatorName: user.name,
      creatorUsername: user.username,
    })
    .from(pattern)
    .leftJoin(user, eq(pattern.createdBy, user.id))
    .where(and(eq(pattern.id, patternId), eq(pattern.createdBy, userId)))
    .limit(1);

  return rows[0] ?? null;
}
