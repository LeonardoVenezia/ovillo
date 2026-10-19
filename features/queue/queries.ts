import { and, asc, count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import type { PatternCategory } from "@/db/pattern-schema";
import { pattern } from "@/db/pattern-schema";
import { queueItem } from "@/db/queue-schema";
import type { YarnWeight } from "@/db/yarn-schema";
import type { Craft } from "@/features/profile/constants";

/**
 * Consultas de "Quiero tejer" (spec §5.8). La cola es privada y se lee al
 * momento, como el resto del cuaderno: sin `"use cache"` y siempre por
 * `userId`.
 */

export type QueueEntry = {
  id: string;
  position: number;
  notes: string | null;
  targetDate: string | null;
  plannedStashItemId: string | null;
  patternId: string;
  patternSlug: string;
  patternName: string;
  designerName: string | null;
  craft: Craft | null;
  category: PatternCategory;
  difficulty: number | null;
  yarnWeight: YarnWeight | null;
};

/** La cola completa, en el orden guardado. */
export async function listQueue(userId: string): Promise<QueueEntry[]> {
  return getDb()
    .select({
      id: queueItem.id,
      position: queueItem.position,
      notes: queueItem.notes,
      targetDate: queueItem.targetDate,
      plannedStashItemId: queueItem.plannedStashItemId,
      patternId: pattern.id,
      patternSlug: pattern.slug,
      patternName: pattern.name,
      designerName: pattern.designerName,
      craft: pattern.craft,
      category: pattern.category,
      difficulty: pattern.difficulty,
      yarnWeight: pattern.yarnWeight,
    })
    .from(queueItem)
    .innerJoin(pattern, eq(queueItem.patternId, pattern.id))
    .where(eq(queueItem.userId, userId))
    .orderBy(asc(queueItem.position), asc(queueItem.createdAt));
}

/** La entrada de ese patrón en la cola, si existe (botón de la ficha). */
export async function getQueueEntry(
  userId: string,
  patternId: string,
): Promise<{ id: string } | null> {
  const [row] = await getDb()
    .select({ id: queueItem.id })
    .from(queueItem)
    .where(
      and(eq(queueItem.userId, userId), eq(queueItem.patternId, patternId)),
    )
    .limit(1);
  return row ?? null;
}

/** Cuántos patrones tiene en la cola (resumen del hub). */
export async function countQueue(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(queueItem)
    .where(eq(queueItem.userId, userId));
  return row?.value ?? 0;
}
