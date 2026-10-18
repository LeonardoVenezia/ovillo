import type { FiberPart, YarnFiber, YarnWeight } from "@/db/yarn-schema";
import { es } from "@/messages/es";

/**
 * Cómo se muestra la lana (spec §5.6): el grosor y las fibras guardan slugs
 * en la base y acá se traducen a lo que lee una tejedora.
 */

export function weightLabel(weight: YarnWeight): string {
  return es.yarns.weights[weight];
}

export function fiberLabel(fiber: YarnFiber): string {
  return es.yarns.fibers[fiber];
}

/** "60% algodón · 40% poliamida (nylon)" */
export function formatComposition(fiber: FiberPart[]): string {
  return fiber
    .map((part) => `${part.percent}% ${fiberLabel(part.fiber).toLowerCase()}`)
    .join(" · ");
}

/** "100 g · 200 m"; `null` si no hay ningún dato del ovillo. */
export function formatSkein(
  grams: number | null,
  meters: number | null,
): string | null {
  const parts: string[] = [];
  if (grams !== null) {
    parts.push(`${grams} g`);
  }
  if (meters !== null) {
    parts.push(`${meters} m`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Milímetros con coma decimal, sin ceros de más: "3,5". */
function formatMm(mm: number): string {
  return String(Math.round(mm * 100) / 100).replace(".", ",");
}

/** "4 mm", "3,5–4,5 mm"; `null` si no hay ninguna medida. */
export function formatNeedles(
  min: number | null,
  max: number | null,
): string | null {
  if (min !== null && max !== null) {
    return min === max
      ? `${formatMm(min)} mm`
      : `${formatMm(min)}–${formatMm(max)} mm`;
  }
  const single = min ?? max;
  return single === null ? null : `${formatMm(single)} mm`;
}
