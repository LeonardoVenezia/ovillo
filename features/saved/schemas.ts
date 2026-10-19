import { z } from "zod";

import {
  COLLECTION_NAME_MAX,
  SAVED_TYPES,
} from "@/db/saved-schema";
import { es } from "@/messages/es";

/**
 * Validación de guardados y colecciones (spec §5.8 y §9). Los textos vacíos
 * son válidos donde significan "sin dato" (se guardan en `null`).
 */

/** Nombre y visibilidad de una colección (alta y edición). */
export const collectionInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, es.saved.errors.nameRequired)
    .max(COLLECTION_NAME_MAX, es.saved.errors.nameLong),
  visibility: z.enum(["publico", "privado"]),
});

/** Alta de un guardado: destino polimórfico. */
export const saveItemSchema = z.object({
  targetType: z.enum(SAVED_TYPES),
  targetId: z.string().trim().min(1).max(64, es.saved.errors.targetNotFound),
});

/** Mover un guardado a una colección ("" = sin colección). */
export const moveSavedItemSchema = z.object({
  id: z.string().trim().min(1),
  collectionId: z.string().trim().max(64),
});

export type CollectionInput = z.infer<typeof collectionInputSchema>;
