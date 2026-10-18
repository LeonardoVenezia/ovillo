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
import { project } from "@/db/project-schema";
import { isYarnWeight, type YarnWeight } from "@/db/yarn-schema";
import { isCraft, type Craft } from "@/features/profile/constants";
import { likeContains } from "@/lib/search";
import { normalizeText } from "@/lib/slug";

import {
  parseDifficulty,
  parseLanguage,
  parseYardageBucket,
  resolvePatternOrder,
} from "./params";

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
  /** Idioma del patrón (`es`, `en`, `pt`, `otro`). */
  language?: string;
  /** Tramo de metraje (`hasta-400`, `400-800`, `mas-800`). */
  yardage?: string;
  /** Orden explícito (`relevancia`, `populares`, `recientes`). */
  order?: string;
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
  /** Proyectos públicos hechos con este patrón (spec §5.5). */
  projectCount: number;
};

export type PatternDetail = Omit<PatternListItem, "projectCount"> & {
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

/**
 * Cuántos proyectos públicos (y sin borrar) están hechos con cada patrón:
 * alimenta el orden "populares" y el dato que muestra la tarjeta.
 */
const countPublicProjects = sql<number>`(
  select count(*)::int
  from ${project}
  where ${project.patternId} = ${pattern.id}
    and ${project.visibility} = 'publico'
    and ${project.deletedAt} is null
)`.as("project_count");

/** Puntaje de relevancia del buscador (spec §6) para la consulta dada. */
function rankFor(query: string) {
  return sql<number>`ts_rank(${pattern.searchVector}, websearch_to_tsquery('spanish', ${query}))`;
}

/**
 * Patrones de la biblioteca, con los `sin-revisar` incluidos (spec §5.5: la
 * propuesta queda visible al instante, marcada en la interfaz). El orden por
 * defecto es recientes; con búsqueda, relevancia (spec §5.5).
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
    const like = likeContains(query);
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
  const language = filters.language ? parseLanguage(filters.language) : null;
  if (language !== null) {
    conditions.push(eq(pattern.language, language));
  }
  const yardage = filters.yardage ? parseYardageBucket(filters.yardage) : null;
  if (yardage !== null) {
    const total = sql`coalesce(${pattern.yardageMax}, ${pattern.yardageMin})`;
    conditions.push(
      yardage === "hasta-400"
        ? sql`${total} <= 400`
        : yardage === "400-800"
          ? sql`${total} > 400 and ${total} <= 800`
          : sql`${total} > 800`,
    );
  }

  const order = resolvePatternOrder(filters.order ?? "", query.length > 0);

  return getDb()
    .select({ ...patternColumns, projectCount: countPublicProjects })
    .from(pattern)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      ...(order === "relevancia"
        ? [desc(rankFor(query)), desc(pattern.createdAt), asc(pattern.name)]
        : order === "populares"
          ? [
              desc(countPublicProjects),
              desc(pattern.createdAt),
              asc(pattern.name),
            ]
          : [desc(pattern.createdAt), asc(pattern.name)]),
    );
}

export type PatternOption = {
  id: string;
  slug: string;
  name: string;
  designerName: string | null;
};

/**
 * Opciones para vincular un proyecto a un patrón de la biblioteca (el
 * selector del formulario de proyectos). Es la lista corta que necesita un
 * `<select>`; cuando la biblioteca crezca va a pedir un buscador con
 * escriba-y-elija.
 */
export async function listPatternOptions(): Promise<PatternOption[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("patrones");

  return getDb()
    .select({
      id: pattern.id,
      slug: pattern.slug,
      name: pattern.name,
      designerName: pattern.designerName,
    })
    .from(pattern)
    .orderBy(asc(pattern.name));
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
