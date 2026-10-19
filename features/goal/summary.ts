/**
 * Resumen anual de "Mi año tejiendo" (spec §5.14): proyectos terminados por
 * año, metros tejidos y lana más usada. Funciones puras para que las pruebas
 * cubran todos los caminos (ovillos, gramos, lanas sin etiqueta completa).
 *
 * Los metros se **estiman** con lo que se sepa de cada lana: si el uso está en
 * ovillos y se conocen los metros por ovillo (etiqueta del catálogo o del
 * inventario), se multiplica; si está en gramos, se usa la proporción
 * metros ÷ gramos. Nunca se inventan números: cuando no se puede derivar, la
 * lana no suma a los metros (pero puede sumar a los gramos).
 */

export type YearUsage = {
  /** Clave única de la lana: id del inventario o del catálogo. */
  yarnKey: string;
  /** "Fil Piuma · Katia" o "Lana de mi abuela". */
  label: string;
  skeinsUsed: number | null;
  gramsUsed: number | null;
  /** Metros por ovillo, si se conocen. */
  metersPerSkein: number | null;
  /** Gramos por ovillo, si se conocen. */
  gramsPerSkein: number | null;
  /** Metros por gramo (para usos anotados solo en gramos). */
  metersPerGram: number | null;
};

export type YearProject = {
  id: string;
  /** `YYYY-MM-DD` del día en que quedó terminado. */
  finishedAt: string;
  usages: YearUsage[];
};

export type TopYarn = {
  label: string;
  meters: number | null;
  grams: number | null;
};

export type YearSummary = {
  year: number;
  /** Proyectos terminados ese año (tengan o no lanas anotadas). */
  finishedCount: number;
  /** Suma de metros derivables; `null` si ninguna lana lo permite. */
  totalMeters: number | null;
  /** Suma de gramos derivables; `null` si ninguna lana lo permite. */
  totalGrams: number | null;
  topYarn: TopYarn | null;
};

/** Metros de un uso, o `null` si no se pueden derivar. */
export function usageMeters(usage: YearUsage): number | null {
  if (usage.skeinsUsed !== null && usage.metersPerSkein !== null) {
    return usage.skeinsUsed * usage.metersPerSkein;
  }
  if (usage.gramsUsed !== null && usage.metersPerGram !== null) {
    return usage.gramsUsed * usage.metersPerGram;
  }
  return null;
}

/** Gramos de un uso, o `null` si no se pueden derivar. */
export function usageGrams(usage: YearUsage): number | null {
  if (usage.gramsUsed !== null) {
    return usage.gramsUsed;
  }
  if (usage.skeinsUsed !== null && usage.gramsPerSkein !== null) {
    return usage.skeinsUsed * usage.gramsPerSkein;
  }
  return null;
}

/**
 * El resumen del año pedido: cuenta los proyectos con `finishedAt` de ese año
 * y suma lo usado en ellos. La "lana más usada" se decide por metros y, en
 * empate, por gramos; el nombre desempata para que el resultado sea estable.
 */
export function buildYearSummary(
  projects: YearProject[],
  year: number,
): YearSummary {
  const prefix = `${year}-`;
  const finished = projects.filter((project) =>
    project.finishedAt.startsWith(prefix),
  );

  let totalMeters: number | null = null;
  let totalGrams: number | null = null;
  const byYarn = new Map<
    string,
    { label: string; meters: number | null; grams: number | null }
  >();

  for (const project of finished) {
    for (const usage of project.usages) {
      const meters = usageMeters(usage);
      const grams = usageGrams(usage);
      if (meters === null && grams === null) {
        continue;
      }

      if (meters !== null) {
        totalMeters = (totalMeters ?? 0) + meters;
      }
      if (grams !== null) {
        totalGrams = (totalGrams ?? 0) + grams;
      }

      const entry = byYarn.get(usage.yarnKey) ?? {
        label: usage.label,
        meters: null,
        grams: null,
      };
      if (meters !== null) {
        entry.meters = (entry.meters ?? 0) + meters;
      }
      if (grams !== null) {
        entry.grams = (entry.grams ?? 0) + grams;
      }
      byYarn.set(usage.yarnKey, entry);
    }
  }

  let topEntry: {
    label: string;
    meters: number | null;
    grams: number | null;
  } | null = null;
  for (const entry of byYarn.values()) {
    if (
      topEntry === null ||
      (entry.meters ?? -1) > (topEntry.meters ?? -1) ||
      ((entry.meters ?? -1) === (topEntry.meters ?? -1) &&
        (entry.grams ?? -1) > (topEntry.grams ?? -1)) ||
      ((entry.meters ?? -1) === (topEntry.meters ?? -1) &&
        (entry.grams ?? -1) === (topEntry.grams ?? -1) &&
        entry.label.localeCompare(topEntry.label, "es") < 0)
    ) {
      topEntry = entry;
    }
  }

  return {
    year,
    finishedCount: finished.length,
    totalMeters: totalMeters === null ? null : Math.round(totalMeters),
    totalGrams: totalGrams === null ? null : Math.round(totalGrams),
    topYarn:
      topEntry === null
        ? null
        : {
            label: topEntry.label,
            meters:
              topEntry.meters === null ? null : Math.round(topEntry.meters),
            grams: topEntry.grams === null ? null : Math.round(topEntry.grams),
          },
  };
}

/** 1200 → "1.200" (punto de miles, sin depender del ICU del runtime). */
export function formatCount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
