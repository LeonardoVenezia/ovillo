import { z } from "zod";

import {
  YARN_FIBERS,
  YARN_WEIGHTS,
  isYarnFiber,
  type FiberPart,
} from "@/db/yarn-schema";
import { COUNTRY_CODES } from "@/features/profile/countries";
import { isQuarterStepMm } from "@/features/tools/schemas";
import { es } from "@/messages/es";

/**
 * Validación del catálogo de lanas (spec §5.6).
 *
 * `yarnInputSchema` es el contrato del servidor; `parseYarnForm` hace de
 * puente con lo que devuelve el formulario (todo texto) y devuelve los
 * errores por campo para que la interfaz los muestre donde corresponde.
 * El servidor revalida siempre.
 */

export const YARN_NAME_MAX = 80;
export const BRAND_NAME_MAX = 60;
export const FIBERS_MAX = 6;
export const GRAMS_MIN = 1;
export const GRAMS_MAX = 2000;
export const METERS_MIN = 1;
export const METERS_MAX = 20000;
export const NEEDLE_MM_MIN = 0.5;
export const NEEDLE_MM_MAX = 25;

const fiberPartSchema = z.object({
  fiber: z.enum(YARN_FIBERS),
  percent: z
    .number()
    .int()
    .min(1, es.yarns.errors.fiberPercentRange)
    .max(100, es.yarns.errors.fiberPercentRange),
});

const gramsField = z
  .number()
  .int()
  .min(GRAMS_MIN, es.yarns.errors.gramsRange)
  .max(GRAMS_MAX, es.yarns.errors.gramsRange)
  .nullable()
  .default(null);

const metersField = z
  .number()
  .int()
  .min(METERS_MIN, es.yarns.errors.metersRange)
  .max(METERS_MAX, es.yarns.errors.metersRange)
  .nullable()
  .default(null);

const needleField = z
  .number()
  .refine(
    (value) =>
      value >= NEEDLE_MM_MIN &&
      value <= NEEDLE_MM_MAX &&
      isQuarterStepMm(value),
    es.yarns.errors.needlesInvalid,
  )
  .nullable()
  .default(null);

const yarnObjectSchema = z.object({
  /** Marca existente; `null` cuando se propone una marca nueva. */
  brandId: z.string().trim().min(1).nullable().default(null),
  brandName: z
    .string()
    .trim()
    .max(BRAND_NAME_MAX, es.yarns.errors.brandNameLong)
    .default(""),
  brandCountry: z.union([z.enum(COUNTRY_CODES), z.literal("")]).default(""),
  name: z
    .string()
    .trim()
    .min(1, es.yarns.errors.nameRequired)
    .max(YARN_NAME_MAX, es.yarns.errors.nameLong),
  weight: z.enum(YARN_WEIGHTS, { message: es.yarns.errors.weightRequired }),
  fiber: z
    .array(fiberPartSchema)
    .min(1, es.yarns.errors.fiberRequired)
    .max(FIBERS_MAX, es.yarns.errors.fiberCount),
  grams: gramsField,
  meters: metersField,
  needleMmMin: needleField,
  needleMmMax: needleField,
});

/** Reglas que cruzan campos: marca nueva, composición al 100% y rango de agujas. */
function checkYarnRules(
  data: z.infer<typeof yarnObjectSchema>,
  ctx: z.RefinementCtx,
): void {
  if (data.brandId === null && data.brandName.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["brandName"],
      message: es.yarns.errors.brandRequired,
    });
  }
  const sum = data.fiber.reduce((total, part) => total + part.percent, 0);
  if (sum !== 100) {
    ctx.addIssue({
      code: "custom",
      path: ["fiber"],
      message: es.yarns.errors.fiberSum,
    });
  }
  if (
    data.needleMmMin !== null &&
    data.needleMmMax !== null &&
    data.needleMmMin > data.needleMmMax
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["needleMmMax"],
      message: es.yarns.errors.needlesOrder,
    });
  }
}

export const yarnInputSchema = yarnObjectSchema.superRefine(checkYarnRules);

export type YarnInput = z.infer<typeof yarnObjectSchema>;

export const yarnUpdateSchema = yarnObjectSchema
  .extend({ id: z.string().min(1) })
  .superRefine(checkYarnRules);

export type YarnUpdateInput = z.infer<typeof yarnUpdateSchema>;

/** Lo que el formulario tiene en pantalla (todo texto, se convierte al enviar). */
export type YarnFormState = {
  /** Id de una marca del catálogo, `"otra"` o `""` sin elegir. */
  brandChoice: string;
  brandName: string;
  brandCountry: string;
  name: string;
  weight: string;
  fibers: { fiber: string; percentText: string }[];
  gramsText: string;
  metersText: string;
  needleMinText: string;
  needleMaxText: string;
};

export type YarnFieldKey =
  | "brand"
  | "name"
  | "weight"
  | "fiber"
  | "grams"
  | "meters"
  | "needles"
  | "generic";

export type YarnFieldErrors = Partial<Record<YarnFieldKey, string>>;

/** Formulario en blanco, con una fibra al 100% como punto de partida. */
export const emptyYarnForm: YarnFormState = {
  brandChoice: "",
  brandName: "",
  brandCountry: "",
  name: "",
  weight: "",
  fibers: [{ fiber: "lana", percentText: "100" }],
  gramsText: "",
  metersText: "",
  needleMinText: "",
  needleMaxText: "",
};

/** Lee un entero escrito a mano; `null` si está vacío, `"invalid"` si no es un número. */
function readInteger(value: string): number | null | "invalid" {
  const normalized = value.trim();
  if (normalized === "") {
    return null;
  }
  if (!/^\d{1,6}$/.test(normalized)) {
    return "invalid";
  }
  return Number(normalized);
}

/** Lee milímetros con coma o punto, en la grilla real de agujas. */
function readNeedle(value: string): number | null | "invalid" {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return "invalid";
  }
  const rounded = Math.round(parsed * 100) / 100;
  if (
    rounded < NEEDLE_MM_MIN ||
    rounded > NEEDLE_MM_MAX ||
    !isQuarterStepMm(rounded)
  ) {
    return "invalid";
  }
  return rounded;
}

/** Dónde mostrar cada error del esquema compartido. */
function fieldForPath(path: PropertyKey): YarnFieldKey {
  const key = String(path);
  if (key === "brandId" || key === "brandName" || key === "brandCountry") {
    return "brand";
  }
  if (key === "name" || key === "weight" || key === "fiber") {
    return key;
  }
  if (key === "grams" || key === "meters") {
    return key;
  }
  if (key === "needleMmMin" || key === "needleMmMax") {
    return "needles";
  }
  return "generic";
}

/**
 * Convierte el formulario en el contrato del servidor y devuelve los errores
 * por campo. Los números se leen acá (se acepta la coma decimal); las reglas
 * del negocio las aplica `yarnInputSchema`, la misma que revalida el servidor.
 */
export function parseYarnForm(
  state: YarnFormState,
): { ok: true; input: YarnInput } | { ok: false; errors: YarnFieldErrors } {
  const errors: YarnFieldErrors = {};

  const grams = readInteger(state.gramsText);
  if (grams === "invalid") {
    errors.grams = es.yarns.errors.gramsRange;
  }
  const meters = readInteger(state.metersText);
  if (meters === "invalid") {
    errors.meters = es.yarns.errors.metersRange;
  }
  const needleMmMin = readNeedle(state.needleMinText);
  const needleMmMax = readNeedle(state.needleMaxText);
  if (needleMmMin === "invalid" || needleMmMax === "invalid") {
    errors.needles = es.yarns.errors.needlesInvalid;
  }

  const fiber: FiberPart[] = [];
  for (const row of state.fibers) {
    if (!isYarnFiber(row.fiber)) {
      errors.fiber = es.yarns.errors.fiberRequired;
      break;
    }
    const percent = readInteger(row.percentText);
    if (percent === null || percent === "invalid") {
      errors.fiber = es.yarns.errors.fiberPercentRange;
      break;
    }
    fiber.push({ fiber: row.fiber, percent });
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const parsed = yarnInputSchema.safeParse({
    brandId:
      state.brandChoice === "" || state.brandChoice === "otra"
        ? null
        : state.brandChoice,
    brandName: state.brandChoice === "otra" ? state.brandName : "",
    brandCountry: state.brandChoice === "otra" ? state.brandCountry : "",
    name: state.name,
    weight: state.weight,
    fiber,
    grams,
    meters,
    needleMmMin,
    needleMmMax,
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldForPath(issue.path[0] ?? "");
      errors[field] ??= issue.message;
    }
    return { ok: false, errors };
  }

  return { ok: true, input: parsed.data };
}
