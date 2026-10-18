"use server";

import { and, count, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { rowCounter } from "@/db/counter-schema";
import { project } from "@/db/project-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import { getOwnCounter } from "./queries";
import {
  clampCounterCount,
  COUNTERS_PER_PROJECT_MAX,
  counterCreateSchema,
  counterSaveSchema,
  counterUpdateSchema,
} from "./schemas";

/**
 * Acciones del contador de vueltas (spec §5.4 y §9: Zod + autorización en
 * cada mutación). El guardado del conteo es la única acción que se llama en
 * segundo plano (el teléfono puede estar sin conexión): recibe `baseVersion`
 * y resuelve el conflicto con la versión del servidor (D-035).
 */

export type CounterActionResult = { ok: true } | { ok: false; error: string };

export type CounterCreateResult =
  { ok: true; id: string } | { ok: false; error: string };

export type CounterSaveResult =
  | { ok: true; count: number; version: number; conflict: boolean }
  | { ok: false; error: string };

/** Proyecto propio y vivo: la puerta de entrada de todas las acciones. */
async function getOwnProject(userId: string, projectId: string) {
  const rows = await getDb()
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Crea un contador nuevo para un proyecto propio. */
export async function createCounter(
  input: unknown,
): Promise<CounterCreateResult> {
  const user = await requireUser();
  const parsed = counterCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.counters.errors.generic };
  }

  const own = await getOwnProject(user.id, parsed.data.projectId);
  if (!own) {
    return { ok: false, error: es.counters.errors.generic };
  }

  const [existing] = await getDb()
    .select({ value: count() })
    .from(rowCounter)
    .where(eq(rowCounter.projectId, own.id));
  if ((existing?.value ?? 0) >= COUNTERS_PER_PROJECT_MAX) {
    return { ok: false, error: es.counters.errors.limit };
  }

  const [created] = await getDb()
    .insert(rowCounter)
    .values({
      projectId: own.id,
      name: parsed.data.name,
      repeatEvery: parsed.data.repeatEvery,
    })
    .returning({ id: rowCounter.id });

  return { ok: true, id: created.id };
}

/** Renombra un contador o cambia su recordatorio (no toca el conteo). */
export async function updateCounter(
  input: unknown,
): Promise<CounterActionResult> {
  const user = await requireUser();
  const parsed = counterUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.counters.errors.generic };
  }

  const own = await getOwnCounter(user.id, parsed.data.id);
  if (!own) {
    return { ok: false, error: es.counters.errors.generic };
  }

  await getDb()
    .update(rowCounter)
    .set({ name: parsed.data.name, repeatEvery: parsed.data.repeatEvery })
    .where(eq(rowCounter.id, own.counter.id));

  return { ok: true };
}

/** Elimina un contador (definitivo: no hay papelera para el conteo). */
export async function deleteCounter(
  counterId: string,
): Promise<CounterActionResult> {
  const user = await requireUser();
  if (typeof counterId !== "string" || counterId.length === 0) {
    return { ok: false, error: es.counters.errors.generic };
  }

  const own = await getOwnCounter(user.id, counterId);
  if (!own) {
    return { ok: false, error: es.counters.errors.generic };
  }

  await getDb().delete(rowCounter).where(eq(rowCounter.id, own.counter.id));
  return { ok: true };
}

/**
 * Guarda el conteo que trae el teléfono. Si la versión del cliente ya quedó
 * atrás (otra sesión contó o reinició), no se pisa nada: se devuelve lo que
 * hay en el servidor con `conflict: true` y la pantalla lo avisa.
 */
export async function saveCounterCount(
  input: unknown,
): Promise<CounterSaveResult> {
  const user = await requireUser();
  const parsed = counterSaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.counters.errors.generic };
  }

  const own = await getOwnCounter(user.id, parsed.data.id);
  if (!own) {
    return { ok: false, error: es.counters.errors.notFound };
  }

  if (parsed.data.baseVersion !== own.counter.version) {
    // Mismo valor: nuestro guardado anterior llegó y la respuesta se perdió.
    if (own.counter.count === clampCounterCount(parsed.data.count)) {
      return {
        ok: true,
        count: own.counter.count,
        version: own.counter.version,
        conflict: false,
      };
    }
    return {
      ok: true,
      count: own.counter.count,
      version: own.counter.version,
      conflict: true,
    };
  }

  const nextCount = clampCounterCount(parsed.data.count);
  if (nextCount === own.counter.count) {
    // Nada cambió de verdad (por ejemplo, un reintento): no gasta versión.
    return {
      ok: true,
      count: own.counter.count,
      version: own.counter.version,
      conflict: false,
    };
  }

  const [updated] = await getDb()
    .update(rowCounter)
    .set({ count: nextCount, version: own.counter.version + 1 })
    .where(eq(rowCounter.id, own.counter.id))
    .returning({ count: rowCounter.count, version: rowCounter.version });

  return {
    ok: true,
    count: updated.count,
    version: updated.version,
    conflict: false,
  };
}
