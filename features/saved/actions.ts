"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, count, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { pattern } from "@/db/pattern-schema";
import { project } from "@/db/project-schema";
import {
  COLLECTION_LIMIT,
  SAVED_LIMIT,
  collection,
  savedItem,
  type SavedType,
} from "@/db/saved-schema";
import { yarn } from "@/db/yarn-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import {
  collectionInputSchema,
  moveSavedItemSchema,
  saveItemSchema,
  type CollectionInput,
} from "./schemas";

/**
 * Acciones de guardados y colecciones (spec §5.8 y §9: Zod + autorización en
 * cada mutación). Guardar verifica que el destino exista y sea visible para
 * quien guarda: un proyecto ajeno solo se puede guardar si es público (D-052).
 */

export type SavedActionResult = { ok: true } | { ok: false; error: string };

export type SavedSaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Código de Postgres para violación de unique. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "23505"
  );
}

/** ¿El destino existe y esta persona puede verlo? */
async function targetExists(
  userId: string,
  targetType: SavedType,
  targetId: string,
): Promise<boolean> {
  const db = getDb();

  if (targetType === "patron") {
    const [row] = await db
      .select({ id: pattern.id })
      .from(pattern)
      .where(eq(pattern.id, targetId))
      .limit(1);
    return Boolean(row);
  }

  if (targetType === "lana") {
    const [row] = await db
      .select({ id: yarn.id })
      .from(yarn)
      .where(eq(yarn.id, targetId))
      .limit(1);
    return Boolean(row);
  }

  const [row] = await db
    .select({
      id: project.id,
      visibility: project.visibility,
      ownerId: project.userId,
    })
    .from(project)
    .where(and(eq(project.id, targetId), isNull(project.deletedAt)))
    .limit(1);
  if (!row) {
    return false;
  }
  return row.visibility === "publico" || row.ownerId === userId;
}

/** Guarda un patrón, proyecto o lana. Idempotente: si ya está, devuelve el id. */
export async function saveItem(input: {
  targetType: string;
  targetId: string;
}): Promise<SavedSaveResult> {
  const user = await requireUser();
  const parsed = saveItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.saved.errors.targetNotFound };
  }
  const { targetType, targetId } = parsed.data;

  if (!(await targetExists(user.id, targetType, targetId))) {
    return { ok: false, error: es.saved.errors.targetNotFound };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: savedItem.id })
    .from(savedItem)
    .where(
      and(
        eq(savedItem.userId, user.id),
        eq(savedItem.targetType, targetType),
        eq(savedItem.targetId, targetId),
      ),
    )
    .limit(1);
  if (existing) {
    return { ok: true, id: existing.id };
  }

  const [total] = await db
    .select({ value: count() })
    .from(savedItem)
    .where(eq(savedItem.userId, user.id));
  if ((total?.value ?? 0) >= SAVED_LIMIT) {
    return { ok: false, error: es.saved.errors.itemLimit };
  }

  const id = createId();
  try {
    await db.insert(savedItem).values({
      id,
      userId: user.id,
      targetType,
      targetId,
    });
  } catch (error) {
    // Dos toques a la vez sobre lo mismo: la unique frena el segundo.
    if (isUniqueViolation(error)) {
      const [raced] = await db
        .select({ id: savedItem.id })
        .from(savedItem)
        .where(
          and(
            eq(savedItem.userId, user.id),
            eq(savedItem.targetType, targetType),
            eq(savedItem.targetId, targetId),
          ),
        )
        .limit(1);
      if (raced) {
        return { ok: true, id: raced.id };
      }
    }
    return { ok: false, error: es.saved.errors.generic };
  }

  return { ok: true, id };
}

/** Quita un guardado. Idempotente: si ya no estaba, no es un error. */
export async function unsaveItem(id: string): Promise<SavedActionResult> {
  const user = await requireUser();
  await getDb()
    .delete(savedItem)
    .where(and(eq(savedItem.id, id), eq(savedItem.userId, user.id)));
  return { ok: true };
}

/** Crea una colección (privada por defecto en la interfaz). */
export async function createCollection(
  input: CollectionInput,
): Promise<SavedSaveResult> {
  const user = await requireUser();
  const parsed = collectionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.saved.errors.generic,
    };
  }

  const db = getDb();
  const [total] = await db
    .select({ value: count() })
    .from(collection)
    .where(eq(collection.userId, user.id));
  if ((total?.value ?? 0) >= COLLECTION_LIMIT) {
    return { ok: false, error: es.saved.errors.collectionLimit };
  }

  const id = createId();
  try {
    await db.insert(collection).values({
      id,
      userId: user.id,
      name: parsed.data.name,
      visibility: parsed.data.visibility,
    });
  } catch (error) {
    return {
      ok: false,
      error: isUniqueViolation(error)
        ? es.saved.errors.duplicateName
        : es.saved.errors.generic,
    };
  }

  return { ok: true, id };
}

/** Renombra y/o cambia la visibilidad de una colección propia. */
export async function updateCollection(
  id: string,
  input: CollectionInput,
): Promise<SavedActionResult> {
  const user = await requireUser();
  const parsed = collectionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.saved.errors.generic,
    };
  }

  try {
    const updated = await getDb()
      .update(collection)
      .set({ name: parsed.data.name, visibility: parsed.data.visibility })
      .where(and(eq(collection.id, id), eq(collection.userId, user.id)))
      .returning({ id: collection.id });
    if (updated.length === 0) {
      return { ok: false, error: es.saved.errors.collectionNotFound };
    }
  } catch (error) {
    return {
      ok: false,
      error: isUniqueViolation(error)
        ? es.saved.errors.duplicateName
        : es.saved.errors.generic,
    };
  }

  return { ok: true };
}

/**
 * Borra una colección propia. Los guardados no se pierden: por la foreign key
 * (`set null`) quedan en "Sin colección".
 */
export async function deleteCollection(id: string): Promise<SavedActionResult> {
  const user = await requireUser();
  const deleted = await getDb()
    .delete(collection)
    .where(and(eq(collection.id, id), eq(collection.userId, user.id)))
    .returning({ id: collection.id });
  if (deleted.length === 0) {
    return { ok: false, error: es.saved.errors.collectionNotFound };
  }
  return { ok: true };
}

/** Mueve un guardado a una colección propia ("" = sin colección). */
export async function moveSavedItem(input: {
  id: string;
  collectionId: string;
}): Promise<SavedActionResult> {
  const user = await requireUser();
  const parsed = moveSavedItemSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.saved.errors.notFound };
  }

  const db = getDb();
  const [item] = await db
    .select({ id: savedItem.id })
    .from(savedItem)
    .where(
      and(eq(savedItem.id, parsed.data.id), eq(savedItem.userId, user.id)),
    )
    .limit(1);
  if (!item) {
    return { ok: false, error: es.saved.errors.notFound };
  }

  let collectionId: string | null = null;
  if (parsed.data.collectionId !== "") {
    const [owned] = await db
      .select({ id: collection.id })
      .from(collection)
      .where(
        and(
          eq(collection.id, parsed.data.collectionId),
          eq(collection.userId, user.id),
        ),
      )
      .limit(1);
    if (!owned) {
      return { ok: false, error: es.saved.errors.collectionNotFound };
    }
    collectionId = owned.id;
  }

  await db
    .update(savedItem)
    .set({ collectionId })
    .where(eq(savedItem.id, item.id));

  return { ok: true };
}
