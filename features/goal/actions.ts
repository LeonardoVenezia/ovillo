"use server";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { yearlyGoal } from "@/db/goal-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import { goalSetSchema, goalYearSchema, type GoalSetInput } from "./schemas";

/**
 * Acciones de la meta anual (spec §5.14 y §9: Zod + autorización en cada
 * mutación). Cada persona trabaja solo sobre su propia meta: el `user_id`
 * sale de la sesión, nunca del cliente.
 */

export type GoalActionResult = { ok: true } | { ok: false; error: string };

/** Anota o cambia la meta de proyectos terminados de un año (upsert). */
export async function setYearlyGoal(
  input: GoalSetInput,
): Promise<GoalActionResult> {
  const user = await requireUser();
  const parsed = goalSetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.goal.errors.generic,
    };
  }

  await getDb()
    .insert(yearlyGoal)
    .values({
      userId: user.id,
      year: parsed.data.year,
      targetProjects: parsed.data.targetProjects,
    })
    .onConflictDoUpdate({
      target: [yearlyGoal.userId, yearlyGoal.year],
      set: { targetProjects: parsed.data.targetProjects },
    });

  return { ok: true };
}

/** Quita la meta del año. Idempotente: si no había, no pasa nada. */
export async function clearYearlyGoal(year: number): Promise<GoalActionResult> {
  const user = await requireUser();
  const parsed = goalYearSchema.safeParse({ year });
  if (!parsed.success) {
    return { ok: false, error: es.goal.errors.generic };
  }

  await getDb()
    .delete(yearlyGoal)
    .where(
      and(
        eq(yearlyGoal.userId, user.id),
        eq(yearlyGoal.year, parsed.data.year),
      ),
    );

  return { ok: true };
}
