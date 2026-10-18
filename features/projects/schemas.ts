import { z } from "zod";

import { PROJECT_STATUSES } from "@/db/project-schema";
import { CRAFT_SLUGS } from "@/features/profile/constants";
import { slugify } from "@/lib/slug";
import { es } from "@/messages/es";

/**
 * Validación de proyectos (spec §5.3): esquemas compartidos cliente/servidor.
 *
 * Hay dos formas del mismo formulario: `projectFormSchema` trabaja con lo que
 * devuelve un `<input>` (todo texto) y `projectInputSchema` con los valores
 * ya convertidos que recibe la acción del servidor. `toProjectInput` hace el
 * puente, y el servidor revalida siempre.
 */

export const NAME_MAX = 80;
export const NOTES_MAX = 2000;
export const PATTERN_MAX = 300;
export const SIZE_MAX = 40;
export const MADE_FOR_MAX = 60;
export const TAG_MAX = 24;
export const TAGS_LIMIT = 10;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Convierte "a, b, c" en ["a", "b", "c"]; sin espacios ni vacíos. */
export function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

/**
 * Slug para la URL pública del proyecto: minúsculas, sin acentos ni símbolos.
 * Si el nombre no deja nada utilizable (ej. emojis), cae en "proyecto".
 */
export function slugifyProjectName(name: string): string {
  return slugify(name, "proyecto");
}

export const projectInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, es.projects.errors.nameRequired)
    .max(NAME_MAX, es.projects.errors.nameLong),
  craft: z.union([z.enum(CRAFT_SLUGS), z.literal("")]),
  status: z.enum(PROJECT_STATUSES),
  progress: z
    .number()
    .int()
    .min(0, es.projects.errors.progressRange)
    .max(100, es.projects.errors.progressRange)
    .nullable(),
  patternText: z
    .string()
    .trim()
    .max(PATTERN_MAX, es.projects.errors.patternLong),
  size: z.string().trim().max(SIZE_MAX, es.projects.errors.sizeLong),
  madeFor: z.string().trim().max(MADE_FOR_MAX, es.projects.errors.madeForLong),
  startedAt: z.union([
    z.literal(""),
    z.string().regex(DATE_PATTERN, es.projects.errors.dateInvalid),
  ]),
  tags: z
    .array(z.string().trim().min(1).max(TAG_MAX, es.projects.errors.tagLong))
    .max(TAGS_LIMIT, es.projects.errors.tagsCount),
  notes: z.string().trim().max(NOTES_MAX, es.projects.errors.notesLong),
  visibility: z.enum(["publico", "privado"]),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectFormSchema = projectInputSchema
  .omit({ progress: true, startedAt: true, tags: true })
  .extend({
    progress: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === "" || (/^\d{1,3}$/.test(value) && Number(value) <= 100),
        { message: es.projects.errors.progressRange },
      ),
    startedAt: z
      .string()
      .trim()
      .refine((value) => value === "" || DATE_PATTERN.test(value), {
        message: es.projects.errors.dateInvalid,
      }),
    tagsText: z
      .string()
      .refine((value) => splitTags(value).length <= TAGS_LIMIT, {
        message: es.projects.errors.tagsCount,
      })
      .refine(
        (value) => splitTags(value).every((tag) => tag.length <= TAG_MAX),
        { message: es.projects.errors.tagLong },
      ),
  });

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const emptyProjectValues: ProjectFormValues = {
  name: "",
  craft: "",
  status: "tejiendo",
  progress: "",
  patternText: "",
  size: "",
  madeFor: "",
  startedAt: "",
  tagsText: "",
  notes: "",
  visibility: "publico",
};

/** Traduce los valores del formulario al contrato de la acción. */
export function toProjectInput(values: ProjectFormValues): ProjectInput {
  const { tagsText, progress, ...rest } = values;
  return {
    ...rest,
    progress: progress === "" ? null : Number(progress),
    tags: splitTags(tagsText),
  };
}
