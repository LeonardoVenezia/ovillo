import { z } from "zod";

import { PATTERN_CATEGORIES, PATTERN_LANGUAGES } from "@/db/pattern-schema";
import { YARN_WEIGHTS } from "@/db/yarn-schema";
import { CRAFT_SLUGS } from "@/features/profile/constants";
import { es } from "@/messages/es";

/**
 * Validación de la biblioteca de patrones (spec §5.5).
 *
 * `patternInputSchema` es el contrato del servidor; `parsePatternForm` hace de
 * puente con lo que devuelve el formulario (todo texto) y devuelve los
 * errores por campo para que la interfaz los muestre donde corresponde.
 * El servidor revalida siempre.
 */

export const PATTERN_NAME_MAX = 120;
export const DESIGNER_NAME_MAX = 80;
export const SOURCE_URL_MAX = 300;
export const TEXT_MAX = 80;
export const SIZES_MAX = 120;
export const YARDAGE_MIN = 1;
export const YARDAGE_MAX = 50000;

/** El enlace tiene que ser navegable: http o https. */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const yardageField = z
  .number()
  .int()
  .min(YARDAGE_MIN, es.patterns.errors.yardageRange)
  .max(YARDAGE_MAX, es.patterns.errors.yardageRange)
  .nullable()
  .default(null);

const shortTextField = (message: string) =>
  z.string().trim().max(TEXT_MAX, message).default("");

const patternObjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, es.patterns.errors.nameRequired)
    .max(PATTERN_NAME_MAX, es.patterns.errors.nameLong),
  designerName: z
    .string()
    .trim()
    .max(DESIGNER_NAME_MAX, es.patterns.errors.designerLong)
    .default(""),
  sourceUrl: z
    .string()
    .trim()
    .min(1, es.patterns.errors.sourceRequired)
    .max(SOURCE_URL_MAX, es.patterns.errors.sourceLong)
    .refine(isHttpUrl, es.patterns.errors.sourceInvalid),
  craft: z.enum(CRAFT_SLUGS, { message: es.patterns.errors.craftRequired }),
  category: z.enum(PATTERN_CATEGORIES, {
    message: es.patterns.errors.categoryRequired,
  }),
  difficulty: z
    .number()
    .int()
    .min(1, es.patterns.errors.difficultyRange)
    .max(5, es.patterns.errors.difficultyRange)
    .nullable()
    .default(null),
  /** Grosor sugerido: un grosor del catálogo o sin decir. */
  weight: z.union([z.enum(YARN_WEIGHTS), z.literal("")]).default(""),
  yardageMin: yardageField,
  yardageMax: yardageField,
  needleSizes: shortTextField(es.patterns.errors.needlesLong),
  gauge: shortTextField(es.patterns.errors.gaugeLong),
  sizes: z
    .string()
    .trim()
    .max(SIZES_MAX, es.patterns.errors.sizesLong)
    .default(""),
  language: z.enum(PATTERN_LANGUAGES, {
    message: es.patterns.errors.languageRequired,
  }),
});

/** Regla que cruza campos: el metraje es un rango coherente. */
function checkPatternRules(
  data: z.infer<typeof patternObjectSchema>,
  ctx: z.RefinementCtx,
): void {
  if (
    data.yardageMin !== null &&
    data.yardageMax !== null &&
    data.yardageMin > data.yardageMax
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["yardageMax"],
      message: es.patterns.errors.yardageOrder,
    });
  }
}

export const patternInputSchema =
  patternObjectSchema.superRefine(checkPatternRules);

export type PatternInput = z.infer<typeof patternObjectSchema>;

export const patternUpdateSchema = patternObjectSchema
  .extend({ id: z.string().min(1) })
  .superRefine(checkPatternRules);

export type PatternUpdateInput = z.infer<typeof patternUpdateSchema>;

/** Lo que el formulario tiene en pantalla (todo texto, se convierte al enviar). */
export type PatternFormState = {
  name: string;
  designerName: string;
  sourceUrl: string;
  craft: string;
  category: string;
  difficulty: string;
  weight: string;
  yardageMinText: string;
  yardageMaxText: string;
  needleSizes: string;
  gauge: string;
  sizes: string;
  language: string;
};

export type PatternFieldKey =
  | "name"
  | "designer"
  | "source"
  | "craft"
  | "category"
  | "difficulty"
  | "weight"
  | "yardage"
  | "needles"
  | "gauge"
  | "sizes"
  | "language"
  | "generic";

export type PatternFieldErrors = Partial<Record<PatternFieldKey, string>>;

/** Formulario en blanco; el idioma arranca en español, que es lo más común. */
export const emptyPatternForm: PatternFormState = {
  name: "",
  designerName: "",
  sourceUrl: "",
  craft: "",
  category: "",
  difficulty: "",
  weight: "",
  yardageMinText: "",
  yardageMaxText: "",
  needleSizes: "",
  gauge: "",
  sizes: "",
  language: "es",
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

/** Dónde mostrar cada error del esquema compartido. */
function fieldForPath(path: PropertyKey): PatternFieldKey {
  const key = String(path);
  if (key === "designerName") {
    return "designer";
  }
  if (key === "sourceUrl") {
    return "source";
  }
  if (key === "yardageMin" || key === "yardageMax") {
    return "yardage";
  }
  if (key === "needleSizes") {
    return "needles";
  }
  if (
    key === "name" ||
    key === "craft" ||
    key === "category" ||
    key === "difficulty" ||
    key === "weight" ||
    key === "gauge" ||
    key === "sizes" ||
    key === "language"
  ) {
    return key;
  }
  return "generic";
}

/**
 * Convierte el formulario en el contrato del servidor y devuelve los errores
 * por campo. Los números se leen acá; las reglas del negocio las aplica
 * `patternInputSchema`, la misma que revalida el servidor.
 */
export function parsePatternForm(
  state: PatternFormState,
):
  | { ok: true; input: PatternInput }
  | { ok: false; errors: PatternFieldErrors } {
  const errors: PatternFieldErrors = {};

  const yardageMin = readInteger(state.yardageMinText);
  const yardageMax = readInteger(state.yardageMaxText);
  if (yardageMin === "invalid" || yardageMax === "invalid") {
    errors.yardage = es.patterns.errors.yardageRange;
  }

  let difficulty: number | null = null;
  if (state.difficulty !== "") {
    const value = Number(state.difficulty);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      errors.difficulty = es.patterns.errors.difficultyRange;
    } else {
      difficulty = value;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const parsed = patternInputSchema.safeParse({
    name: state.name,
    designerName: state.designerName,
    sourceUrl: state.sourceUrl,
    craft: state.craft,
    category: state.category,
    difficulty,
    weight: state.weight,
    yardageMin,
    yardageMax,
    needleSizes: state.needleSizes,
    gauge: state.gauge,
    sizes: state.sizes,
    language: state.language,
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
