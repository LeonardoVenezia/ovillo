import { es } from "@/messages/es";

import type { StashListItem } from "./queries";

/**
 * Disponible de una lana (total − asignada), listo para mostrar. Los ovillos
 * mandan; si no hay ovillos cargados, mandan los gramos. `warn` avisa cuando
 * hay más asignado que total: se permite (D-045), pero mejor avisar.
 */
export function stashAvailability(item: StashListItem): {
  text: string;
  warn: boolean;
} {
  if (item.skeins !== null) {
    const available = item.skeins - item.assignedSkeins;
    if (available < 0) {
      return {
        text: es.stash.overassigned.replace(
          "{used}",
          String(item.assignedSkeins),
        ),
        warn: true,
      };
    }
    if (available === 0) {
      return { text: es.stash.allAssigned, warn: false };
    }
    const template =
      item.skeins === 1
        ? es.stash.availableSkeinsOne
        : es.stash.availableSkeins;
    return {
      text: template
        .replace("{available}", String(available))
        .replace("{total}", String(item.skeins)),
      warn: false,
    };
  }
  if (item.grams !== null) {
    const available = item.grams - item.assignedGrams;
    if (available <= 0) {
      return { text: es.stash.allAssigned, warn: false };
    }
    return {
      text: es.stash.availableGrams
        .replace("{available}", String(available))
        .replace("{total}", String(item.grams)),
      warn: false,
    };
  }
  return { text: es.stash.noQuantity, warn: false };
}
