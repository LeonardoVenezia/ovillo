import { z } from "zod";

import { COUNTER_COUNT_MAX } from "@/db/counter-schema";
import { es } from "@/messages/es";

export { COUNTER_COUNT_MAX };

/**
 * Validación y lógica pura de los contadores (spec §5.4).
 *
 * El guardado que hace el teléfono es "optimista": el cliente cuenta sin
 * esperar al servidor y manda `{ count, baseVersion }`. Si la versión no
 * cambió, se guarda; si cambió (otra sesión), gana el servidor y el cliente
 * lo avisa (D-035).
 */

export const COUNTER_NAME_MAX = 40;
export const COUNTER_REPEAT_MIN = 2;
export const COUNTER_REPEAT_MAX = 999;
/** Tope de contadores por proyecto: más que esto no se usa y ensucia la vista. */
export const COUNTERS_PER_PROJECT_MAX = 10;

const nameField = z
  .string()
  .trim()
  .min(1, es.counters.errors.nameRequired)
  .max(COUNTER_NAME_MAX, es.counters.errors.nameLong);

const repeatField = z
  .number()
  .int(es.counters.errors.repeatRange)
  .min(COUNTER_REPEAT_MIN, es.counters.errors.repeatRange)
  .max(COUNTER_REPEAT_MAX, es.counters.errors.repeatRange)
  .nullable();

export const counterCreateSchema = z.object({
  projectId: z.string().min(1),
  name: nameField,
  repeatEvery: repeatField,
});

export const counterUpdateSchema = z.object({
  id: z.string().min(1),
  name: nameField,
  repeatEvery: repeatField,
});

/** Guardado que llega del contador del teléfono (incluso desde offline). */
export const counterSaveSchema = z.object({
  id: z.string().min(1),
  count: z.number().int().min(0).max(COUNTER_COUNT_MAX),
  baseVersion: z.number().int().min(1),
});

export type CounterCreateInput = z.infer<typeof counterCreateSchema>;
export type CounterUpdateInput = z.infer<typeof counterUpdateSchema>;
export type CounterSaveInput = z.infer<typeof counterSaveSchema>;

/** Deja un número entero dentro de los topes del contador (0..99999). */
export function clampCounterCount(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(COUNTER_COUNT_MAX, Math.max(0, Math.trunc(value)));
}

/** ¿Toca el recordatorio de "cada N vueltas" en este número? */
export function isReminderDue(
  count: number,
  repeatEvery: number | null,
): boolean {
  return repeatEvery !== null && count > 0 && count % repeatEvery === 0;
}

/**
 * Qué valor queda al reencontrarse el teléfono y el servidor (al montar una
 * página o al volver la conexión). Reglas:
 *
 * - Sin cambios pendientes: manda el estado local guardado si es más nuevo
 *   que el que trae la página (por ejemplo, un prefetch viejo); si no, la
 *   página.
 * - Con cambios pendientes sobre la misma versión: el valor del teléfono
 *   sigue pendiente (`dirty`) hasta que se guarde.
 * - Con cambios pendientes pero versión distinta: si el valor coincide, el
 *   guardado ya había llegado; si no, gana el servidor y se marca `conflict`.
 */
export function resolveSyncState(
  local: { count: number; version: number; dirty: boolean },
  server: { count: number; version: number },
): { count: number; version: number; dirty: boolean; conflict: boolean } {
  if (!local.dirty) {
    if (local.version > server.version) {
      return {
        count: clampCounterCount(local.count),
        version: local.version,
        dirty: false,
        conflict: false,
      };
    }
    return {
      count: server.count,
      version: server.version,
      dirty: false,
      conflict: false,
    };
  }

  if (local.version === server.version) {
    return {
      count: clampCounterCount(local.count),
      version: server.version,
      dirty: true,
      conflict: false,
    };
  }

  // Versión distinta pero mismo valor: nuestro guardado llegó y la respuesta
  // se perdió; no hay nada que avisar.
  if (local.count === server.count) {
    return {
      count: server.count,
      version: server.version,
      dirty: false,
      conflict: false,
    };
  }

  return {
    count: server.count,
    version: server.version,
    dirty: false,
    conflict: true,
  };
}
