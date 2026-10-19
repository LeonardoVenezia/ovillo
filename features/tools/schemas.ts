import { z } from "zod";

import { TOOL_KINDS, TOOL_MATERIALS } from "@/db/tool-schema";
import { es } from "@/messages/es";

/**
 * Validación de las herramientas del inventario (spec §5.7).
 *
 * Topes pensados para el uso real: la grilla de medidas que se vende (paso de
 * 0,25 mm entre 0,5 y 25), cantidades chicas y notas cortas. El servidor los
 * vuelve a aplicar aunque el cliente ya los haya validado.
 */

/** Tope de herramientas por persona: más que esto ya no es un inventario. */
export const TOOLS_PER_USER_MAX = 200;
export const TOOL_SIZE_MM_MIN = 0.5;
export const TOOL_SIZE_MM_MAX = 25;
export const TOOL_LENGTH_CM_MIN = 10;
export const TOOL_LENGTH_CM_MAX = 300;
export const TOOL_QUANTITY_MIN = 1;
export const TOOL_QUANTITY_MAX = 99;
export const TOOL_NOTES_MAX = 200;

/** ¿La medida cae en la grilla de 0,25 mm en la que se venden las agujas? */
export function isQuarterStepMm(mm: number): boolean {
  if (!Number.isFinite(mm)) {
    return false;
  }
  const hundredths = Math.round(mm * 100);
  return hundredths % 25 === 0;
}

/**
 * Lee lo que escribió la persona: acepta coma o punto decimal y valida contra
 * la grilla de medidas. Devuelve `null` si está vacío, el número si es válido
 * y `"invalid"` si no.
 */
export function parseSizeMmInput(value: string): number | null | "invalid" {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return "invalid";
  }
  const rounded = Math.round(parsed * 100) / 100;
  if (rounded < TOOL_SIZE_MM_MIN || rounded > TOOL_SIZE_MM_MAX) {
    return "invalid";
  }
  return isQuarterStepMm(rounded) ? rounded : "invalid";
}

const sizeField = z
  .number()
  .refine(
    (value) => value >= TOOL_SIZE_MM_MIN && value <= TOOL_SIZE_MM_MAX,
    es.tools.errors.sizeRange,
  )
  .refine(isQuarterStepMm, es.tools.errors.sizeStep);

const lengthField = z
  .number()
  .int(es.tools.errors.cableRange)
  .min(TOOL_LENGTH_CM_MIN, es.tools.errors.cableRange)
  .max(TOOL_LENGTH_CM_MAX, es.tools.errors.cableRange)
  .nullable()
  .default(null);

const quantityField = z
  .number()
  .int(es.tools.errors.quantityRange)
  .min(TOOL_QUANTITY_MIN, es.tools.errors.quantityRange)
  .max(TOOL_QUANTITY_MAX, es.tools.errors.quantityRange)
  .default(1);

const notesField = z
  .string()
  .trim()
  .max(TOOL_NOTES_MAX, es.tools.errors.notesLong)
  .nullable()
  .default(null);

export const toolCreateSchema = z.object({
  kind: z.enum(TOOL_KINDS),
  sizeMm: sizeField,
  material: z.enum(TOOL_MATERIALS).nullable().default(null),
  lengthCm: lengthField,
  quantity: quantityField,
  notes: notesField,
});

export const toolUpdateSchema = toolCreateSchema.extend({
  id: z.string().min(1),
});

export type ToolCreateInput = z.infer<typeof toolCreateSchema>;
export type ToolUpdateInput = z.infer<typeof toolUpdateSchema>;

/**
 * Vínculo herramienta ↔ proyecto (`project_tool`, spec §5.3): solo ids; la
 * pertenencia de ambos se verifica en la acción, nunca en el cliente.
 */
export const projectToolLinkSchema = z.object({
  projectId: z.string().min(1),
  toolId: z.string().min(1),
});

export type ProjectToolLinkInput = z.infer<typeof projectToolLinkSchema>;
