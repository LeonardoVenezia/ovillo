import { describe, expect, it } from "vitest";

import { appendPosition, moveQueueItem } from "./position";

/**
 * Órdenes fraccionales de la cola (D-051): punto medio entre vecinas,
 * renumeración cuando el hueco se agota y recorte de índices.
 */

const cola = [
  { id: "a", position: 1 },
  { id: "b", position: 2 },
  { id: "c", position: 3 },
];

describe("appendPosition", () => {
  it("la primera entrada arranca en 1", () => {
    expect(appendPosition([])).toBe(1);
  });

  it("las siguientes van después de la última", () => {
    expect(appendPosition([1, 2.5, 3])).toBe(4);
  });
});

describe("moveQueueItem", () => {
  it("al principio queda antes de la primera", () => {
    expect(moveQueueItem(cola, "c", 0)).toEqual([{ id: "c", position: 0 }]);
  });

  it("al medio usa el punto medio de las vecinas", () => {
    expect(moveQueueItem(cola, "a", 1)).toEqual([{ id: "a", position: 2.5 }]);
  });

  it("al final queda después de la última", () => {
    expect(moveQueueItem(cola, "a", 2)).toEqual([{ id: "a", position: 4 }]);
  });

  it("recorta un índice fuera de rango", () => {
    expect(moveQueueItem(cola, "b", 99)).toEqual([{ id: "b", position: 4 }]);
    expect(moveQueueItem(cola, "b", -5)).toEqual([{ id: "b", position: 0 }]);
  });

  it("con el hueco agotado renumera todo conservando el orden visible", () => {
    const apretada = [
      { id: "a", position: 1 },
      { id: "b", position: 1 + 1e-9 },
      { id: "c", position: 2 },
    ];
    expect(moveQueueItem(apretada, "c", 1)).toEqual([
      { id: "a", position: 1 },
      { id: "c", position: 2 },
      { id: "b", position: 3 },
    ]);
  });

  it("una cola de una sola entrada se puede mover igual", () => {
    expect(moveQueueItem([{ id: "a", position: 7 }], "a", 0)).toEqual([
      { id: "a", position: 1 },
    ]);
  });
});
