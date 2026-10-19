import type { YarnWeight } from "@/db/yarn-schema";

import type { StashListItem } from "./queries";

/**
 * Stock del inventario agrupado por grosor: es lo que alimenta el filtro
 * "Con mi lana" del buscador de patrones (spec §5.6) y cruza el grosor y
 * los metros del patrón contra lo que hay disponible en casa (D-049).
 *
 * Los metros disponibles se estiman **proporcionales a lo asignado**: la
 * asignación a proyectos se guarda en ovillos y/o gramos (nunca en metros),
 * así que una lana a medio usar aporta la proporción de metros que le queda,
 * no una resta exacta. Es una estimación optimista, suficiente para cruzar
 * el metraje de un patrón.
 */

export type StashStockEntry = {
  weight: YarnWeight;
  /** Metros disponibles del grosor (0 si ninguna lana tiene metros cargados). */
  meters: number;
  /** ¿Alguna lana de este grosor tiene metros? Sin esto no se cruza el metraje. */
  hasMeters: boolean;
  /** Cuántas lanas de este grosor tienen algo disponible. */
  items: number;
};

/** Fracción de lana ya usada por los proyectos activos (0–1). */
function usedRatio(item: StashListItem): number {
  const ratios: number[] = [];
  if (item.skeins !== null && item.skeins > 0) {
    ratios.push(item.assignedSkeins / item.skeins);
  }
  if (item.grams !== null && item.grams > 0) {
    ratios.push(item.assignedGrams / item.grams);
  }
  return ratios.length === 0 ? 0 : Math.min(Math.max(...ratios), 1);
}

/**
 * Agrupa las lanas del inventario por grosor, dejando afuera lo que ya está
 * todo asignado o lo que no tiene grosor (una carga libre sin dato). Las
 * lanas vinculadas al catálogo aportan el grosor del catálogo, las libres,
 * el propio.
 */
export function stashStockFromItems(items: StashListItem[]): StashStockEntry[] {
  const byWeight = new Map<YarnWeight, StashStockEntry>();

  for (const item of items) {
    const weight = item.yarn?.weight ?? item.weight;
    if (!weight) {
      continue;
    }

    const ratio = usedRatio(item);
    if (ratio >= 1) {
      continue;
    }

    const entry = byWeight.get(weight) ?? {
      weight,
      meters: 0,
      hasMeters: false,
      items: 0,
    };
    entry.items += 1;
    if (item.metersTotal !== null) {
      entry.hasMeters = true;
      entry.meters += Math.round(item.metersTotal * (1 - ratio));
    }
    byWeight.set(weight, entry);
  }

  return [...byWeight.values()];
}
