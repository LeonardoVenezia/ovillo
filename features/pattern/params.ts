import { isPatternLanguage, type PatternLanguage } from "@/db/pattern-schema";

/**
 * Parámetros de la búsqueda de patrones (spec §5.5): traducen lo que llega
 * por URL (siempre texto) al vocabulario real. Un valor raro no rompe nada:
 * simplemente no filtra. Viven acá, aparte de las consultas, para poder
 * probarlos sin base de datos.
 */

/** Dificultad válida de la URL (1–5), o `null` para no filtrar. */
export function parseDifficulty(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }
  return parsed;
}

export const PATTERN_ORDERS = ["relevancia", "populares", "recientes"] as const;

export type PatternOrder = (typeof PATTERN_ORDERS)[number];

export function isPatternOrder(value: string): value is PatternOrder {
  return (PATTERN_ORDERS as readonly string[]).includes(value);
}

/**
 * Orden efectivo del listado: el elegido en la URL o, por defecto,
 * relevancia cuando hay búsqueda y recientes cuando no.
 */
export function resolvePatternOrder(
  value: string,
  hasQuery: boolean,
): PatternOrder {
  if (isPatternOrder(value) && !(value === "relevancia" && !hasQuery)) {
    return value;
  }
  return hasQuery ? "relevancia" : "recientes";
}

/**
 * Metraje como tramos (lo que pide la spec §5.5 en los filtros avanzados):
 * se compara contra el mayor dato cargado del patrón y, si falta, contra el
 * menor; los patrones sin metraje quedan fuera de cualquier tramo.
 */
export const YARDAGE_BUCKETS = ["hasta-400", "400-800", "mas-800"] as const;

export type YardageBucket = (typeof YARDAGE_BUCKETS)[number];

export function parseYardageBucket(value: string): YardageBucket | null {
  return (YARDAGE_BUCKETS as readonly string[]).includes(value)
    ? (value as YardageBucket)
    : null;
}

/** Idioma válido de la URL, o `null` para no filtrar. */
export function parseLanguage(value: string): PatternLanguage | null {
  return isPatternLanguage(value) ? value : null;
}
