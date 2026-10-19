import { z } from "zod";

import { es } from "@/messages/es";

/**
 * Validación de la meta anual (spec §5.14): esquemas compartidos
 * cliente/servidor. El año lo calcula la página (siempre es el actual) y el
 * objetivo se valida con el rango de acá.
 */

export const YEAR_MIN = 2000;
export const YEAR_MAX = 2100;

/** Rango razonable de la meta: de 1 a 200 proyectos por año. */
export const GOAL_TARGET_MIN = 1;
export const GOAL_TARGET_MAX = 200;

export const goalSetSchema = z.object({
  year: z.number().int().min(YEAR_MIN).max(YEAR_MAX),
  targetProjects: z
    .number()
    .int()
    .min(GOAL_TARGET_MIN, es.goal.errors.targetRange)
    .max(GOAL_TARGET_MAX, es.goal.errors.targetRange),
});

export const goalYearSchema = z.object({
  year: z.number().int().min(YEAR_MIN).max(YEAR_MAX),
});

export type GoalSetInput = z.infer<typeof goalSetSchema>;
