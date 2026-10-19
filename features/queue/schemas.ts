import { z } from "zod";

import { QUEUE_LIMIT, QUEUE_NOTES_MAX } from "@/db/queue-schema";
import { es } from "@/messages/es";

/**
 * Validación de "Quiero tejer" (spec §9: Zod en cada mutación). Los textos
 * vacíos son válidos y significan "sin dato" (se guardan en `null`).
 */

/** `aaaa-mm-dd`, igual que el resto de fechas del cuaderno (proyectos). */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const queueAddSchema = z.object({
  patternId: z
    .string()
    .trim()
    .min(1, es.queue.errors.patternNotFound)
    .max(64, es.queue.errors.patternNotFound),
});

export const queueMoveSchema = z.object({
  id: z.string().trim().min(1),
  targetIndex: z.number().int().min(0).max(QUEUE_LIMIT),
});

export const queueUpdateSchema = z.object({
  id: z.string().trim().min(1),
  /** "" = sin lana planeada. */
  plannedStashItemId: z.string().trim().max(64),
  /** "" = sin fecha objetivo. */
  targetDate: z.union([
    z.literal(""),
    z.string().regex(DATE_PATTERN, es.queue.errors.dateInvalid),
  ]),
  notes: z.string().trim().max(QUEUE_NOTES_MAX, es.queue.errors.notesLong),
});

export type QueueUpdateInput = z.infer<typeof queueUpdateSchema>;
