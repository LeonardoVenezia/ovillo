import type {
  PatternCategory,
  PatternDifficulty,
  PatternLanguage,
} from "@/db/pattern-schema";
import type { Craft } from "@/features/profile/constants";
import { es } from "@/messages/es";

/**
 * Cómo se muestra un patrón (spec §5.5): la técnica, la categoría, el idioma
 * y la dificultad se guardan como slugs o números y acá se traducen a lo que
 * lee una tejedora.
 */

/** La técnica reutiliza las etiquetas del perfil: mismo vocabulario. */
export function craftLabel(craft: Craft): string {
  return es.profile.craftLabels[craft];
}

export function categoryLabel(category: PatternCategory): string {
  return es.patterns.categories[category];
}

export function languageLabel(language: PatternLanguage): string {
  return es.patterns.languages[language];
}

export function difficultyLabel(value: number): string {
  const labels: Record<PatternDifficulty, string> = es.patterns.difficulties;
  return labels[value as PatternDifficulty] ?? `${value}/5`;
}

/** "Intermedia (3/5)": la etiqueta y el número, para que no queden dudas. */
export function formatDifficulty(value: number): string {
  return `${difficultyLabel(value)} (${value}/5)`;
}

/** "1200–1500 m", "900 m" o "desde 800 m"; `null` si no hay dato. */
export function formatYardage(
  min: number | null,
  max: number | null,
): string | null {
  if (min !== null && max !== null) {
    return min === max ? `${min} m` : `${min}–${max} m`;
  }
  if (min !== null) {
    return `Desde ${min} m`;
  }
  if (max !== null) {
    return `Hasta ${max} m`;
  }
  return null;
}
