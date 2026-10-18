"use server";

import { and, eq, like, ne, sql } from "drizzle-orm";
import { updateTag } from "next/cache";

import { getDb } from "@/db";
import { yarn, yarnBrand } from "@/db/yarn-schema";
import { requireUser } from "@/lib/session";
import { firstFreeSlug, normalizeText, slugify } from "@/lib/slug";
import { es } from "@/messages/es";

import { getOwnYarn } from "./queries";
import { yarnInputSchema, yarnUpdateSchema, type YarnInput } from "./schemas";

/**
 * Acciones del catálogo de lanas (spec §5.6 y §9: Zod + autorización en cada
 * mutación).
 *
 * Cualquier persona con el email confirmado puede proponer una lana; nace
 * `sin-revisar` y visible al instante (la aprueba un moderador en Fase 8).
 * La detección de duplicados por marca + nombre usa la misma comparación sin
 * acentos que el índice único de la base: si dos personas escriben lo mismo,
 * la segunda recibe el aviso con el enlace a la que ya existe.
 *
 * Después de guardar se invalida el caché del catálogo (`updateTag`) para que
 * la propuesta se vea al instante también para quien la hizo.
 */

export type YarnActionResult =
  { ok: true; brandSlug: string; slug: string } | { ok: false; error: string };

/** Marca resuelta para guardar una lana (existente o recién creada). */
type ResolvedBrand = { id: string; slug: string };

const normalizedName = sql`translate(lower(${yarn.name}), 'áéíóúüñ', 'aeiouun')`;
const normalizedBrandName = sql`translate(lower(${yarnBrand.name}), 'áéíóúüñ', 'aeiouun')`;

/**
 * Encuentra la marca del formulario: una del catálogo por id, o la que
 * coincide por nombre (sin acentos) aunque todavía no exista como fila.
 */
async function resolveBrand(
  userId: string,
  data: YarnInput,
): Promise<ResolvedBrand | null> {
  if (data.brandId !== null) {
    const [brand] = await getDb()
      .select({ id: yarnBrand.id, slug: yarnBrand.slug })
      .from(yarnBrand)
      .where(eq(yarnBrand.id, data.brandId))
      .limit(1);
    return brand ?? null;
  }

  const name = normalizeText(data.brandName);
  if (name.length === 0) {
    return null;
  }

  const [existing] = await getDb()
    .select({ id: yarnBrand.id, slug: yarnBrand.slug })
    .from(yarnBrand)
    .where(sql`${normalizedBrandName} = ${name}`)
    .limit(1);
  if (existing) {
    return existing;
  }

  const slug = await uniqueBrandSlug(name);
  const [created] = await getDb()
    .insert(yarnBrand)
    .values({
      name: data.brandName,
      slug,
      country: data.brandCountry === "" ? null : data.brandCountry,
      createdBy: userId,
    })
    .returning({ id: yarnBrand.id, slug: yarnBrand.slug });

  return created ?? null;
}

/** Slug único para toda la tabla: es la URL pública de la marca. */
async function uniqueBrandSlug(name: string): Promise<string> {
  const base = slugify(name, "marca");
  const rows = await getDb()
    .select({ slug: yarnBrand.slug })
    .from(yarnBrand)
    .where(like(yarnBrand.slug, `${base}%`));

  return firstFreeSlug(
    base,
    rows.map((row) => row.slug),
  );
}

/** Slug único dentro de la marca: marca + slug forman la URL de la lana. */
async function uniqueYarnSlug(brandId: string, name: string): Promise<string> {
  const base = slugify(name, "lana");
  const rows = await getDb()
    .select({ slug: yarn.slug })
    .from(yarn)
    .where(and(eq(yarn.brandId, brandId), like(yarn.slug, `${base}%`)));

  return firstFreeSlug(
    base,
    rows.map((row) => row.slug),
  );
}

/** La lana que ya existe con ese nombre en esa marca (sin acentos), si hay. */
async function findDuplicate(
  brandId: string,
  name: string,
  excludeYarnId?: string,
): Promise<{
  id: string;
  name: string;
  slug: string;
  brandName: string;
  brandSlug: string;
} | null> {
  const [row] = await getDb()
    .select({
      id: yarn.id,
      name: yarn.name,
      slug: yarn.slug,
      brandName: yarnBrand.name,
      brandSlug: yarnBrand.slug,
    })
    .from(yarn)
    .innerJoin(yarnBrand, eq(yarn.brandId, yarnBrand.id))
    .where(
      and(
        eq(yarn.brandId, brandId),
        sql`${normalizedName} = ${normalizeText(name)}`,
        excludeYarnId ? ne(yarn.id, excludeYarnId) : undefined,
      ),
    )
    .limit(1);

  return row ?? null;
}

/** Proponer una lana nueva al catálogo (spec §5.6). */
export async function createYarn(input: unknown): Promise<YarnActionResult> {
  const user = await requireUser();
  if (!user.emailVerified) {
    return { ok: false, error: es.yarns.errors.verified };
  }

  const parsed = yarnInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.yarns.errors.generic };
  }
  const data = parsed.data;

  const brand = await resolveBrand(user.id, data);
  if (!brand) {
    return { ok: false, error: es.yarns.errors.brandRequired };
  }

  if (await findDuplicate(brand.id, data.name)) {
    return { ok: false, error: es.yarns.errors.duplicate };
  }

  const slug = await uniqueYarnSlug(brand.id, data.name);
  await getDb().insert(yarn).values({
    brandId: brand.id,
    name: data.name,
    slug,
    weight: data.weight,
    fiber: data.fiber,
    meters: data.meters,
    grams: data.grams,
    needleMmMin: data.needleMmMin,
    needleMmMax: data.needleMmMax,
    status: "sin-revisar",
    createdBy: user.id,
  });

  // Read-your-writes: el catálogo cacheado se revalida ya mismo.
  updateTag("lanas");

  return { ok: true, brandSlug: brand.slug, slug };
}

/**
 * Corregir una lana propia. El slug queda como estaba: si la URL pública ya
 * circuló, sigue funcionando. La marca sí se puede cambiar (si la propuesta
 * quedó en la marca equivocada); el país solo se guarda al crear una marca.
 */
export async function updateYarn(input: unknown): Promise<YarnActionResult> {
  const user = await requireUser();

  const parsed = yarnUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.yarns.errors.generic };
  }
  const data = parsed.data;

  const own = await getOwnYarn(user.id, data.id);
  if (!own) {
    return { ok: false, error: es.yarns.errors.notFound };
  }

  const brand = await resolveBrand(user.id, data);
  if (!brand) {
    return { ok: false, error: es.yarns.errors.brandRequired };
  }

  if (await findDuplicate(brand.id, data.name, own.id)) {
    return { ok: false, error: es.yarns.errors.duplicate };
  }

  await getDb()
    .update(yarn)
    .set({
      brandId: brand.id,
      name: data.name,
      weight: data.weight,
      fiber: data.fiber,
      meters: data.meters,
      grams: data.grams,
      needleMmMin: data.needleMmMin,
      needleMmMax: data.needleMmMax,
    })
    .where(eq(yarn.id, own.id));

  updateTag("lanas");
  updateTag(`lana:${own.brandSlug}/${own.slug}`);
  if (brand.slug !== own.brandSlug) {
    updateTag(`lana:${brand.slug}/${own.slug}`);
  }

  return { ok: true, brandSlug: brand.slug, slug: own.slug };
}

export type YarnDuplicateInfo = {
  brandName: string;
  yarnName: string;
  href: string;
} | null;

/**
 * Chequeo en vivo del formulario: "ya existe una lana con ese nombre en esa
 * marca". Devuelve el enlace a la existente para que se pueda mirar antes de
 * mandar. El servidor lo vuelve a chequear al guardar (y la base lo garantiza
 * con su índice único).
 */
export async function checkYarnDuplicate(input: {
  brandId?: string | null;
  brandName?: string;
  name: string;
  /** Al editar: la propia lana no cuenta como duplicada. */
  excludeYarnId?: string;
}): Promise<YarnDuplicateInfo> {
  const name = normalizeText(input.name ?? "");
  if (name.length === 0) {
    return null;
  }

  let brandId =
    typeof input.brandId === "string" && input.brandId.length > 0
      ? input.brandId
      : null;

  if (brandId === null) {
    const brandName = normalizeText(input.brandName ?? "");
    if (brandName.length === 0) {
      return null;
    }
    const [brand] = await getDb()
      .select({ id: yarnBrand.id })
      .from(yarnBrand)
      .where(sql`${normalizedBrandName} = ${brandName}`)
      .limit(1);
    if (!brand) {
      return null;
    }
    brandId = brand.id;
  }

  const duplicate = await findDuplicate(brandId, name, input.excludeYarnId);
  if (!duplicate) {
    return null;
  }
  return {
    brandName: duplicate.brandName,
    yarnName: duplicate.name,
    href: `/lanas/${duplicate.brandSlug}/${duplicate.slug}`,
  };
}
