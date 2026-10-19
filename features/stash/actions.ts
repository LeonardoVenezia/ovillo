"use server";

import { and, count, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { image } from "@/db/media-schema";
import { project } from "@/db/project-schema";
import { projectYarn, stashItem } from "@/db/stash-schema";
import { yarn } from "@/db/yarn-schema";
import { thumbKeyFor } from "@/features/projects/media-view";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";
import { deleteObject } from "@/storage";

import { getOwnProjectYarn, getOwnStashItem } from "./queries";
import {
  STASH_ITEMS_PER_USER_MAX,
  projectYarnSchema,
  projectYarnUpdateSchema,
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
 *
 * Las asignaciones a proyectos (`project_yarn`, spec §5.3) viven acá también:
 * asignar no muta el inventario, el descuento es la consulta (D-045).
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

/** Proyecto propio y vivo: la puerta de entrada de las asignaciones. */
async function getOwnProject(userId: string, projectId: string) {
  const rows = await getDb()
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Suma una lana a un proyecto propio: del inventario (descuenta disponible)
 * o del catálogo (solo referencia). Asignar no muta el inventario: el
 * descuento lo calcula la consulta (D-045).
 */
export async function addProjectYarn(
  input: unknown,
): Promise<StashActionResult> {
  const user = await requireUser();
  const parsed = projectYarnSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.stash.errors.generic,
    };
  }
  const data = parsed.data;

  const own = await getOwnProject(user.id, data.projectId);
  if (!own) {
    return { ok: false, error: es.stash.errors.projectNotFound };
  }

  // Del inventario o del catálogo, nunca las dos fuentes a la vez.
  let target:
    | { stashItemId: string; yarnId: null }
    | { stashItemId: null; yarnId: string };
  if (data.stashItemId !== null) {
    const item = await getOwnStashItem(user.id, data.stashItemId);
    if (!item) {
      return { ok: false, error: es.stash.errors.notFound };
    }
    target = { stashItemId: item.id, yarnId: null };
  } else if (data.yarnId !== null) {
    const catalog = await getCatalogYarn(data.yarnId);
    if (!catalog) {
      return { ok: false, error: es.stash.errors.yarnRequired };
    }
    target = { stashItemId: null, yarnId: data.yarnId };
  } else {
    return { ok: false, error: es.stash.errors.projectYarnRequired };
  }

  // La misma lana no va dos veces al mismo proyecto.
  const same =
    target.stashItemId !== null
      ? eq(projectYarn.stashItemId, target.stashItemId)
      : eq(projectYarn.yarnId, target.yarnId);
  const [existing] = await getDb()
    .select({ id: projectYarn.id })
    .from(projectYarn)
    .where(and(eq(projectYarn.projectId, own.id), same))
    .limit(1);
  if (existing) {
    return { ok: false, error: es.stash.errors.projectYarnDuplicate };
  }

  await getDb()
    .insert(projectYarn)
    .values({
      projectId: own.id,
      ...target,
      skeinsUsed: data.skeinsUsed,
      gramsUsed: data.gramsUsed,
    });

  return { ok: true };
}

/** Corrige lo usado de una lana del proyecto (ovillos y/o gramos). */
export async function updateProjectYarnUsage(
  input: unknown,
): Promise<StashActionResult> {
  const user = await requireUser();
  const parsed = projectYarnUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.stash.errors.generic,
    };
  }

  const own = await getOwnProjectYarn(user.id, parsed.data.id);
  if (!own) {
    return { ok: false, error: es.stash.errors.projectYarnNotFound };
  }

  await getDb()
    .update(projectYarn)
    .set({
      skeinsUsed: parsed.data.skeinsUsed,
      gramsUsed: parsed.data.gramsUsed,
    })
    .where(eq(projectYarn.id, own.id));

  return { ok: true };
}

/** Quita una lana del proyecto: si era del inventario, vuelve a estar disponible. */
export async function removeProjectYarn(
  linkId: string,
): Promise<StashActionResult> {
  const user = await requireUser();
  if (typeof linkId !== "string" || linkId.length === 0) {
    return { ok: false, error: es.stash.errors.generic };
  }

  const own = await getOwnProjectYarn(user.id, linkId);
  if (!own) {
    return { ok: false, error: es.stash.errors.projectYarnNotFound };
  }

  await getDb().delete(projectYarn).where(eq(projectYarn.id, own.id));
  return { ok: true };
}
