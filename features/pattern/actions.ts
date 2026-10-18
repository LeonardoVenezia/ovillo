"use server";

import { eq, like } from "drizzle-orm";
import { updateTag } from "next/cache";

import { getDb } from "@/db";
import { pattern } from "@/db/pattern-schema";
import { requireUser } from "@/lib/session";
import { firstFreeSlug, slugify } from "@/lib/slug";
import { es } from "@/messages/es";

import { getOwnPattern } from "./queries";
import {
  patternInputSchema,
  patternUpdateSchema,
  type PatternInput,
} from "./schemas";

/**
 * Acciones de la biblioteca de patrones (spec §5.5 y §9: Zod + autorización
 * en cada mutación).
 *
 * Cualquier persona con sesión puede sumar un patrón gratuito (la spec §5.5
 * no pide email confirmado acá); nace `sin-revisar` y visible al instante
 * (lo aprueba un moderador en Fase 8). Por ahora todo patrón se enlaza a
 * donde está publicado: `source_url` es obligatorio.
 *
 * Después de guardar se invalida el caché compartido (`updateTag`) para que
 * la propuesta se vea al instante también para quien la hizo.
 */

export type PatternActionResult =
  { ok: true; slug: string } | { ok: false; error: string };

/** Slug único para toda la tabla: es la URL pública del patrón. */
async function uniquePatternSlug(name: string): Promise<string> {
  const base = slugify(name, "patron");
  const rows = await getDb()
    .select({ slug: pattern.slug })
    .from(pattern)
    .where(like(pattern.slug, `${base}%`));

  return firstFreeSlug(
    base,
    rows.map((row) => row.slug),
  );
}

/** Los campos compartidos entre crear y editar, ya con `""` → `null`. */
function toColumns(data: PatternInput) {
  return {
    name: data.name,
    designerName: data.designerName.length > 0 ? data.designerName : null,
    craft: data.craft,
    category: data.category,
    difficulty: data.difficulty,
    yarnWeight: data.weight === "" ? null : data.weight,
    yardageMin: data.yardageMin,
    yardageMax: data.yardageMax,
    needleSizes: data.needleSizes.length > 0 ? data.needleSizes : null,
    gauge: data.gauge.length > 0 ? data.gauge : null,
    sizes: data.sizes.length > 0 ? data.sizes : null,
    language: data.language,
    sourceUrl: data.sourceUrl,
  };
}

/** Sumar un patrón nuevo a la biblioteca (spec §5.5). */
export async function createPattern(
  input: unknown,
): Promise<PatternActionResult> {
  const user = await requireUser();

  const parsed = patternInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.patterns.errors.generic };
  }
  const data = parsed.data;

  const slug = await uniquePatternSlug(data.name);
  await getDb()
    .insert(pattern)
    .values({
      ...toColumns(data),
      slug,
      status: "sin-revisar",
      createdBy: user.id,
    });

  // Read-your-writes: la biblioteca cacheada se revalida ya mismo.
  updateTag("patrones");

  return { ok: true, slug };
}

/**
 * Corregir un patrón propio. El slug queda como estaba: si la URL pública ya
 * circuló, sigue funcionando.
 */
export async function updatePattern(
  input: unknown,
): Promise<PatternActionResult> {
  const user = await requireUser();

  const parsed = patternUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.patterns.errors.generic };
  }
  const data = parsed.data;

  const own = await getOwnPattern(user.id, data.id);
  if (!own) {
    return { ok: false, error: es.patterns.errors.notFound };
  }

  await getDb()
    .update(pattern)
    .set(toColumns(data))
    .where(eq(pattern.id, own.id));

  updateTag("patrones");
  updateTag(`patron:${own.slug}`);

  return { ok: true, slug: own.slug };
}
