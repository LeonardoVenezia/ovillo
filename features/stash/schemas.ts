import { z } from "zod";

import { COLOR_FAMILIES } from "@/db/stash-schema";
import { YARN_WEIGHTS } from "@/db/yarn-schema";
import { es } from "@/messages/es";

/**
 * Validación del inventario de lana (spec §5.7).
 *
 * Topes pensados para el uso real: un inventario grande tiene cientos de
 * lanas, no miles; las cantidades son números redondos (ovillos y gramos) y
 * los metros se calculan desde el catálogo cuando se puede. El servidor
 * vuelve a aplicar todo aunque el cliente ya lo haya validado.
 */

/** Tope de lanas por persona: más que esto ya no es un inventario. */
export const STASH_ITEMS_PER_USER_MAX = 500;
export const STASH_SKEINS_MAX = 500;
export const STASH_GRAMS_MAX = 99_999;
export const STASH_METERS_MAX = 999_999;
export const STASH_CUSTOM_NAME_MAX = 80;
export const STASH_COLORWAY_MAX = 60;
export const STASH_DYE_LOT_MAX = 60;
export const STASH_LOCATION_MAX = 80;
export const STASH_NOTES_MAX = 300;

/**
 * Lee una cantidad entera escrita a mano: vacío → `null`, número válido → el
 * número, cualquier otra cosa → `"invalid"` (el formulario muestra el error).
 * Acepta el punto de miles ("1.500 g"); los decimales no van: son cantidades.
 */
export function parseCountInput(value: string): number | null | "invalid" {
  let normalized = value.trim();
  if (normalized === "") {
    return null;
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }
  if (!/^\d+$/.test(normalized)) {
    return "invalid";
  }
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return "invalid";
  }
  return parsed;
}

const countField = (max: number, message: string) =>
  z
    .number()
    .int(message)
    .min(1, message)
    .max(max, message)
    .nullable()
    .default(null);

const textField = (max: number, message: string) =>
  z.string().trim().max(max, message).nullable().default(null);

export const stashItemSchema = z
  .object({
    /** Lana del catálogo; `null` en las cargas libres. */
    yarnId: z.string().min(1).nullable().default(null),
    customName: textField(
      STASH_CUSTOM_NAME_MAX,
      es.stash.errors.customNameLong,
    ),
    colorway: textField(STASH_COLORWAY_MAX, es.stash.errors.colorwayLong),
    colorFamily: z.enum(COLOR_FAMILIES).nullable().default(null),
    /** Grosor solo en cargas libres (D-046); se limpia si hay lana vinculada. */
    weight: z.enum(YARN_WEIGHTS).nullable().default(null),
    dyeLot: textField(STASH_DYE_LOT_MAX, es.stash.errors.dyeLotLong),
    skeins: countField(STASH_SKEINS_MAX, es.stash.errors.skeinsRange),
    grams: countField(STASH_GRAMS_MAX, es.stash.errors.gramsRange),
    metersTotal: countField(STASH_METERS_MAX, es.stash.errors.metersRange),
    location: textField(STASH_LOCATION_MAX, es.stash.errors.locationLong),
    notes: textField(STASH_NOTES_MAX, es.stash.errors.notesLong),
  })
  .superRefine((data, ctx) => {
    if (data.yarnId === null && data.customName === null) {
      ctx.addIssue({
        code: "custom",
        path: ["customName"],
        message: es.stash.errors.customNameRequired,
      });
    }
    if (data.skeins === null && data.grams === null) {
      ctx.addIssue({
        code: "custom",
        path: ["skeins"],
        message: es.stash.errors.quantityRequired,
      });
    }
  });

export const stashItemUpdateSchema = stashItemSchema.and(
  z.object({ id: z.string().min(1) }),
);

export type StashItemInput = z.infer<typeof stashItemSchema>;
export type StashItemUpdateInput = z.infer<typeof stashItemUpdateSchema>;

/**
 * Lana usada por un proyecto (spec §5.3): sale del inventario (`stashItemId`,
 * la que descuenta disponible) o del catálogo (`yarnId`, solo referencia).
 * La cantidad va en ovillos y/o gramos, igual que en el inventario.
 */
export const projectYarnSchema = z
  .object({
    projectId: z.string().min(1),
    stashItemId: z.string().min(1).nullable().default(null),
    yarnId: z.string().min(1).nullable().default(null),
    skeinsUsed: countField(STASH_SKEINS_MAX, es.stash.errors.skeinsRange),
    gramsUsed: countField(STASH_GRAMS_MAX, es.stash.errors.gramsRange),
  })
  .superRefine((data, ctx) => {
    if (data.stashItemId === null && data.yarnId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["yarnId"],
        message: es.stash.errors.projectYarnRequired,
      });
    }
    if (data.skeinsUsed === null && data.gramsUsed === null) {
      ctx.addIssue({
        code: "custom",
        path: ["skeinsUsed"],
        message: es.stash.errors.projectYarnQuantity,
      });
    }
  });

export const projectYarnUpdateSchema = z
  .object({
    id: z.string().min(1),
    skeinsUsed: countField(STASH_SKEINS_MAX, es.stash.errors.skeinsRange),
    gramsUsed: countField(STASH_GRAMS_MAX, es.stash.errors.gramsRange),
  })
  .superRefine((data, ctx) => {
    if (data.skeinsUsed === null && data.gramsUsed === null) {
      ctx.addIssue({
        code: "custom",
        path: ["skeinsUsed"],
        message: es.stash.errors.projectYarnQuantity,
      });
    }
  });

export type ProjectYarnInput = z.infer<typeof projectYarnSchema>;
export type ProjectYarnUpdateInput = z.infer<typeof projectYarnUpdateSchema>;

/**
 * Completa gramos y metros a partir de los ovillos y la lana del catálogo
 * (spec §5.7: "cálculo de metros"). Solo completa lo que vino vacío y
 * recorta a los topes de la columna. Sin lana vinculada no toca nada.
 */
export function suggestCatalogAmounts(input: {
  skeins: number | null;
  grams: number | null;
  metersTotal: number | null;
  yarn: { meters: number | null; grams: number | null } | null;
}): { grams: number | null; metersTotal: number | null } {
  const { skeins, yarn } = input;
  let { grams, metersTotal } = input;

  if (yarn && skeins !== null) {
    if (grams === null && yarn.grams !== null) {
      grams = Math.min(skeins * yarn.grams, STASH_GRAMS_MAX);
    }
    if (metersTotal === null && yarn.meters !== null) {
      metersTotal = Math.min(skeins * yarn.meters, STASH_METERS_MAX);
    }
  }

  return { grams, metersTotal };
}
