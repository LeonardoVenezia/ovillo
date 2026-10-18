import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/db";
import { user } from "@/db/auth-schema";
import {
  isYarnFiber,
  isYarnWeight,
  yarn,
  yarnBrand,
  type FiberPart,
  type YarnStatus,
  type YarnWeight,
} from "@/db/yarn-schema";
import type { CountryCode } from "@/features/profile/countries";
import { isCountryCode } from "@/features/profile/countries";
import { normalizeText } from "@/lib/slug";

/**
 * Consultas del catálogo de lanas (spec §5.6).
 *
 * Son datos públicos compartidos, así que van con `"use cache"` +
 * `cacheLife("hours")` y se invalidan desde las acciones con
 * `updateTag("lanas")` (guía de caching de Next 16, D-039). Las entradas
 * cacheadas nacen en la primera petición, nunca en el build: el build de CI
 * no tiene secretos de base.
 *
 * El buscador compara sin mayúsculas ni acentos con el mismo `translate` que
 * usa el índice único de duplicados, para que "algodon" encuentre "Algodón".
 */

/** Filtros del listado; todos opcionales y ya validados por quien llama. */
export type YarnFilters = {
  q?: string;
  weight?: string;
  fiber?: string;
  /** Slug de marca. */
  brand?: string;
  /** Código ISO del país de la marca. */
  country?: string;
};

export type YarnListItem = {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  weight: YarnWeight;
  fiber: FiberPart[];
  meters: number | null;
  grams: number | null;
  needleMmMin: number | null;
  needleMmMax: number | null;
  status: YarnStatus;
  brandName: string;
  brandSlug: string;
  brandCountry: CountryCode | null;
};

export type YarnDetail = YarnListItem & {
  createdBy: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
};

const yarnColumns = {
  id: yarn.id,
  brandId: yarn.brandId,
  name: yarn.name,
  slug: yarn.slug,
  weight: yarn.weight,
  fiber: yarn.fiber,
  meters: yarn.meters,
  grams: yarn.grams,
  needleMmMin: yarn.needleMmMin,
  needleMmMax: yarn.needleMmMax,
  status: yarn.status,
  brandName: yarnBrand.name,
  brandSlug: yarnBrand.slug,
  brandCountry: yarnBrand.country,
};

/** Escapa los comodines de LIKE: una búsqueda siempre es texto literal. */
function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

/**
 * Lanas del catálogo, de la marca A a la Z. Incluye las `sin-revisar` (spec
 * §5.6: la propuesta "queda visible al instante"), marcadas en la interfaz.
 */
export async function listYarns(
  filters: YarnFilters = {},
): Promise<YarnListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("lanas");

  const conditions = [];

  const query = normalizeText(filters.q ?? "").slice(0, 80);
  if (query.length > 0) {
    const pattern = likePattern(query);
    conditions.push(
      or(
        ilike(
          sql`translate(lower(${yarn.name}), 'áéíóúüñ', 'aeiouun')`,
          pattern,
        ),
        ilike(
          sql`translate(lower(${yarnBrand.name}), 'áéíóúüñ', 'aeiouun')`,
          pattern,
        ),
      ),
    );
  }
  if (filters.weight && isYarnWeight(filters.weight)) {
    conditions.push(eq(yarn.weight, filters.weight));
  }
  if (filters.fiber && isYarnFiber(filters.fiber)) {
    conditions.push(
      sql`${yarn.fiber} @> ${JSON.stringify([{ fiber: filters.fiber }])}::jsonb`,
    );
  }
  if (filters.brand) {
    conditions.push(eq(yarnBrand.slug, filters.brand));
  }
  if (filters.country && isCountryCode(filters.country)) {
    conditions.push(eq(yarnBrand.country, filters.country));
  }

  return getDb()
    .select(yarnColumns)
    .from(yarn)
    .innerJoin(yarnBrand, eq(yarn.brandId, yarnBrand.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(yarnBrand.name), asc(yarn.name));
}

/** Una lana por su camino público (`/lanas/marca/slug`). */
export async function getYarnByPath(
  brandSlug: string,
  yarnSlug: string,
): Promise<YarnDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("lanas", `lana:${brandSlug}/${yarnSlug}`);

  const rows = await getDb()
    .select({
      ...yarnColumns,
      createdBy: yarn.createdBy,
      creatorName: user.name,
      creatorUsername: user.username,
    })
    .from(yarn)
    .innerJoin(yarnBrand, eq(yarn.brandId, yarnBrand.id))
    .leftJoin(user, eq(yarn.createdBy, user.id))
    .where(and(eq(yarnBrand.slug, brandSlug), eq(yarn.slug, yarnSlug)))
    .limit(1);

  return rows[0] ?? null;
}

export type YarnBrandOption = {
  id: string;
  name: string;
  slug: string;
  country: CountryCode | null;
};

/** Marcas del catálogo, para los filtros y el formulario de propuesta. */
export async function listBrands(): Promise<YarnBrandOption[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("lanas");

  return getDb()
    .select({
      id: yarnBrand.id,
      name: yarnBrand.name,
      slug: yarnBrand.slug,
      country: yarnBrand.country,
    })
    .from(yarnBrand)
    .orderBy(asc(yarnBrand.name));
}

/** Lana propia por id (para editar): autorización en un solo lugar. */
export async function getOwnYarn(
  userId: string,
  yarnId: string,
): Promise<YarnDetail | null> {
  const rows = await getDb()
    .select({
      ...yarnColumns,
      createdBy: yarn.createdBy,
      creatorName: user.name,
      creatorUsername: user.username,
    })
    .from(yarn)
    .innerJoin(yarnBrand, eq(yarn.brandId, yarnBrand.id))
    .leftJoin(user, eq(yarn.createdBy, user.id))
    .where(and(eq(yarn.id, yarnId), eq(yarn.createdBy, userId)))
    .limit(1);

  return rows[0] ?? null;
}
