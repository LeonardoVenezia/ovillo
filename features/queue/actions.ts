"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, asc, count, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { pattern } from "@/db/pattern-schema";
import { QUEUE_LIMIT, queueItem } from "@/db/queue-schema";
import { stashItem } from "@/db/stash-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import { appendPosition, moveQueueItem as computeMove } from "./position";
import {
  queueAddSchema,
  queueMoveSchema,
  queueUpdateSchema,
  type QueueUpdateInput,
} from "./schemas";

/**
 * Acciones de "Quiero tejer" (spec §5.8 y §9: Zod + autorización en cada
 * mutación). Todas trabajan solo sobre la cola de quien las llama. El orden
 * sale de `position` (D-051): sumar va al final, mover solo toca la entrada
 * movida (o renumera si el hueco se agotó).
 */

export type QueueActionResult = { ok: true } | { ok: false; error: string };

export type QueueAddResult =
  { ok: true; id: string } | { ok: false; error: string };

/** Suma un patrón a la cola. Idempotente: si ya está, devuelve la entrada. */
export async function addToQueue(input: {
  patternId: string;
}): Promise<QueueAddResult> {
  const user = await requireUser();
  const parsed = queueAddSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.queue.errors.patternNotFound };
  }

  const db = getDb();

  const [found] = await db
    .select({ id: pattern.id })
    .from(pattern)
    .where(eq(pattern.id, parsed.data.patternId))
    .limit(1);
  if (!found) {
    return { ok: false, error: es.queue.errors.patternNotFound };
  }

  const [existing] = await db
    .select({ id: queueItem.id })
    .from(queueItem)
    .where(
      and(eq(queueItem.userId, user.id), eq(queueItem.patternId, found.id)),
    )
    .limit(1);
  if (existing) {
    return { ok: true, id: existing.id };
  }

  const [total] = await db
    .select({ value: count() })
    .from(queueItem)
    .where(eq(queueItem.userId, user.id));
  if ((total?.value ?? 0) >= QUEUE_LIMIT) {
    return { ok: false, error: es.queue.errors.limit };
  }

  const [last] = await db
    .select({ position: queueItem.position })
    .from(queueItem)
    .where(eq(queueItem.userId, user.id))
    .orderBy(desc(queueItem.position))
    .limit(1);

  const id = createId();
  try {
    await db.insert(queueItem).values({
      id,
      userId: user.id,
      patternId: found.id,
      position: appendPosition(last ? [last.position] : []),
    });
  } catch {
    // Dos toques a la vez sobre el mismo patrón: la unique frena el segundo.
    const [raced] = await db
      .select({ id: queueItem.id })
      .from(queueItem)
      .where(
        and(eq(queueItem.userId, user.id), eq(queueItem.patternId, found.id)),
      )
      .limit(1);
    return raced
      ? { ok: true, id: raced.id }
      : { ok: false, error: es.queue.errors.generic };
  }

  return { ok: true, id };
}

/** Quita una entrada de la cola. */
export async function removeQueueItem(id: string): Promise<QueueActionResult> {
  const user = await requireUser();
  const deleted = await getDb()
    .delete(queueItem)
    .where(and(eq(queueItem.id, id), eq(queueItem.userId, user.id)))
    .returning({ id: queueItem.id });
  if (deleted.length === 0) {
    return { ok: false, error: es.queue.errors.notFound };
  }
  return { ok: true };
}

/**
 * Mueve una entrada al índice pedido (0-based sobre la lista sin ella, como la
 * ve quien arrastra o toca las flechas).
 */
export async function moveQueueItem(input: {
  id: string;
  targetIndex: number;
}): Promise<QueueActionResult> {
  const user = await requireUser();
  const parsed = queueMoveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.queue.errors.notFound };
  }

  const db = getDb();
  const rows = await db
    .select({ id: queueItem.id, position: queueItem.position })
    .from(queueItem)
    .where(eq(queueItem.userId, user.id))
    .orderBy(asc(queueItem.position), asc(queueItem.createdAt));

  if (!rows.some((row) => row.id === parsed.data.id)) {
    return { ok: false, error: es.queue.errors.notFound };
  }

  const moves = computeMove(rows, parsed.data.id, parsed.data.targetIndex);
  for (const move of moves) {
    await db
      .update(queueItem)
      .set({ position: move.position })
      .where(and(eq(queueItem.id, move.id), eq(queueItem.userId, user.id)));
  }

  return { ok: true };
}

/** Guarda lana planeada, fecha objetivo y notas de una entrada. */
export async function updateQueueItem(
  input: QueueUpdateInput,
): Promise<QueueActionResult> {
  const user = await requireUser();
  const parsed = queueUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.queue.errors.generic,
    };
  }

  const db = getDb();
  const [entry] = await db
    .select({ id: queueItem.id })
    .from(queueItem)
    .where(and(eq(queueItem.id, parsed.data.id), eq(queueItem.userId, user.id)))
    .limit(1);
  if (!entry) {
    return { ok: false, error: es.queue.errors.notFound };
  }

  const plannedStashItemId =
    parsed.data.plannedStashItemId === ""
      ? null
      : parsed.data.plannedStashItemId;

  if (plannedStashItemId) {
    const [owned] = await db
      .select({ id: stashItem.id })
      .from(stashItem)
      .where(
        and(
          eq(stashItem.id, plannedStashItemId),
          eq(stashItem.userId, user.id),
        ),
      )
      .limit(1);
    if (!owned) {
      return { ok: false, error: es.queue.errors.stashNotFound };
    }
  }

  await db
    .update(queueItem)
    .set({
      plannedStashItemId,
      targetDate: parsed.data.targetDate === "" ? null : parsed.data.targetDate,
      notes: parsed.data.notes.length === 0 ? null : parsed.data.notes,
    })
    .where(eq(queueItem.id, entry.id));

  return { ok: true };
}
