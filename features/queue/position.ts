/**
 * Orden fraccional de "Quiero tejer" (spec §6: "orden con índice fraccional").
 *
 * La cola se ordena por `position` (double): mover una entrada **no** renumera
 * a las demás, se ubica en el punto medio entre sus vecinas. Cuando el hueco
 * entre dos vecinas queda demasiado chico para un double (tras muchas
 * inserciones en el mismo lugar), se renumeran todas a 1..n conservando el
 * orden visible (D-051).
 *
 * Funciones puras: las pruebas viven en `position.test.ts` y la acción de
 * servidor solo aplica el resultado.
 */

export type QueuePositionItem = { id: string; position: number };

/** Hueco mínimo para confiar en el punto medio de un double. */
const MIN_GAP = 1e-6;

/** Posición para una entrada que se suma al final de la cola. */
export function appendPosition(positions: number[]): number {
  return positions.length === 0 ? 1 : Math.max(...positions) + 1;
}

/** Punto medio entre vecinas; sin una de las dos, un paso hacia afuera. */
function positionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) {
    return 1;
  }
  if (before === null) {
    return (after as number) - 1;
  }
  if (after === null) {
    return before + 1;
  }
  return (before + after) / 2;
}

/**
 * Mueve `movingId` al índice `targetIndex` (0-based sobre la lista **sin** la
 * entrada movida, como la ve quien arrastra) y devuelve las filas a actualizar:
 * solo la movida, o toda la cola renumerada si no queda hueco.
 */
export function moveQueueItem(
  ordered: QueuePositionItem[],
  movingId: string,
  targetIndex: number,
): QueuePositionItem[] {
  const rest = ordered.filter((item) => item.id !== movingId);
  const index = Math.max(0, Math.min(Math.trunc(targetIndex), rest.length));

  const before = index > 0 ? rest[index - 1].position : null;
  const after = index < rest.length ? rest[index].position : null;
  const position = positionBetween(before, after);

  const gapTooSmall =
    before !== null && after !== null && after - before < MIN_GAP;

  if (!Number.isFinite(position) || gapTooSmall) {
    const merged = [
      ...rest.slice(0, index),
      { id: movingId, position: 0 },
      ...rest.slice(index),
    ];
    return merged.map((item, i) => ({ id: item.id, position: i + 1 }));
  }

  return [{ id: movingId, position }];
}
