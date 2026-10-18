"use server";

import { count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { image } from "@/db/media-schema";
import { stashItem } from "@/db/stash-schema";
import { yarn } from "@/db/yarn-schema";
import { thumbKeyFor } from "@/features/projects/media-view";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";
import { deleteObject } from "@/storage";

import { getOwnStashItem } from "./queries";
import {
  STASH_ITEMS_PER_USER_MAX,
  stashItemSchema,
  stashItemUpdateSchema,
  suggestCatalogAmounts,
  type StashItemInput,
} from "./schemas";

/**
 * Acciones del inventario de lana (spec §5.7 y §9: Zod + autorización en cada
 * mutación). Las cargas libres limpian lo que no les toca (nombre propio y
 * grosor solo van sin lana del catálogo) y, con lana vinculada, los gramos y
 * metros se completan desde la etiqueta si vinieron vacíos.
 */

export type StashActionResult = { ok: true } | { ok: false; error: string };

export type StashCreateResult =
  { ok: true; id: string } | { ok: false; error: string };

/** "": el formulario manda textos vacíos como cadenas; en la base van en null. */
function emptyToNull(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalize(
  input: StashItemInput,
  catalog: { meters: number | null; grams: number | null } | null,
) {
  const linked = input.yarnId !== null;
  const amounts = suggestCatalogAmounts({
    skeins: input.skeins,
    grams: input.grams,
    metersTotal: input.metersTotal,
    yarn: catalog,
  });

  return {
    yarnId: input.yarnId,
    customName: linked ? null : emptyToNull(input.customName),
    weight: linked ? null : input.weight,
    colorway: emptyToNull(input.colorway),
    colorFamily: input.colorFamily,
    dyeLot: emptyToNull(input.dyeLot),
    skeins: input.skeins,
    grams: amounts.grams,
    metersTotal: amounts.metersTotal,
    location: emptyToNull(input.location),
    notes: emptyToNull(input.notes),
  };
}

/** La lana del catálogo vinculada (para sugerir gramos y metros). */
async function getCatalogYarn(yarnId: string) {
  const rows = await getDb()
    .select({ meters: yarn.meters, grams: yarn.grams })
    .from(yarn)
    .where(eq(yarn.id, yarnId))
    .limit(1);
  return rows[0] ?? null;
}

/** Suma una lana al inventario propio. */
export async function createStashItem(
  input: unknown,
): Promise<StashCreateResult> {
  const user = await requireUser();
  const parsed = stashItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.stash.errors.generic };
  }

  const [existing] = await getDb()
    .select({ value: count() })
    .from(stashItem)
    .where(eq(stashItem.userId, user.id));
  if ((existing?.value ?? 0) >= STASH_ITEMS_PER_USER_MAX) {
    return { ok: false, error: es.stash.errors.limit };
  }

  let catalog: { meters: number | null; grams: number | null } | null = null;
  if (parsed.data.yarnId !== null) {
    catalog = await getCatalogYarn(parsed.data.yarnId);
    if (!catalog) {
      return { ok: false, error: es.stash.errors.yarnRequired };
    }
  }

  const [created] = await getDb()
    .insert(stashItem)
    .values({ userId: user.id, ...normalize(parsed.data, catalog) })
    .returning({ id: stashItem.id });

  return { ok: true, id: created.id };
}

/** Corrige una lana propia (cantidad, color, ubicación, notas…). */
export async function updateStashItem(
  input: unknown,
): Promise<StashActionResult> {
  const user = await requireUser();
  const parsed = stashItemUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.stash.errors.generic };
  }

  const own = await getOwnStashItem(user.id, parsed.data.id);
  if (!own) {
    return { ok: false, error: es.stash.errors.notFound };
  }

  let catalog: { meters: number | null; grams: number | null } | null = null;
  if (parsed.data.yarnId !== null) {
    catalog = await getCatalogYarn(parsed.data.yarnId);
    if (!catalog) {
      return { ok: false, error: es.stash.errors.yarnRequired };
    }
  }

  await getDb()
    .update(stashItem)
    .set(normalize(parsed.data, catalog))
    .where(eq(stashItem.id, own.id));

  return { ok: true };
}

/** Borra una foto del inventario: primero R2 (mejor esfuerzo), después la base. */
async function deleteStashImage(imageId: string, r2Key: string): Promise<void> {
  const results = await Promise.allSettled([
    deleteObject(r2Key),
    deleteObject(thumbKeyFor(r2Key)),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        "R2: no se pudo borrar la foto de una lana:",
        result.reason,
      );
    }
  }
  await getDb().delete(image).where(eq(image.id, imageId));
}

/**
 * Elimina una lana del inventario (definitivo). Sus asignaciones a proyectos
 * se van con ella (cascade): lo asignado deja de descontar en esos proyectos.
 */
export async function deleteStashItem(
  itemId: string,
): Promise<StashActionResult> {
  const user = await requireUser();
  if (typeof itemId !== "string" || itemId.length === 0) {
    return { ok: false, error: es.stash.errors.generic };
  }

  const own = await getOwnStashItem(user.id, itemId);
  if (!own) {
    return { ok: false, error: es.stash.errors.notFound };
  }

  await getDb().delete(stashItem).where(eq(stashItem.id, own.id));
  if (own.imageId && own.imageR2Key) {
    await deleteStashImage(own.imageId, own.imageR2Key);
  }

  return { ok: true };
}

/** Quita la foto de una lana (sin borrar la lana). */
export async function removeStashPhoto(
  itemId: string,
): Promise<StashActionResult> {
  const user = await requireUser();
  const own = await getOwnStashItem(user.id, itemId);
  if (!own) {
    return { ok: false, error: es.stash.errors.notFound };
  }
  if (!own.imageId || !own.imageR2Key) {
    return { ok: true };
  }

  await getDb()
    .update(stashItem)
    .set({ imageId: null })
    .where(eq(stashItem.id, own.id));
  await deleteStashImage(own.imageId, own.imageR2Key);

  return { ok: true };
}
