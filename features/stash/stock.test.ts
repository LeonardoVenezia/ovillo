import { describe, expect, it } from "vitest";

import type { StashListItem } from "./queries";
import { stashStockFromItems } from "./stock";

/** Lana de inventario con lo mínimo para el stock; el resto va en null. */
function makeItem(partial: Partial<StashListItem>): StashListItem {
  return {
    id: partial.id ?? "item",
    yarnId: partial.yarnId ?? null,
    customName: partial.customName ?? null,
    colorway: null,
    colorFamily: null,
    weight: partial.weight ?? null,
    dyeLot: null,
    skeins: partial.skeins ?? null,
    grams: partial.grams ?? null,
    metersTotal: partial.metersTotal ?? null,
    location: null,
    notes: null,
    imageId: null,
    imageThumbUrl: null,
    yarn: partial.yarn ?? null,
    assignedSkeins: partial.assignedSkeins ?? 0,
    assignedGrams: partial.assignedGrams ?? 0,
  };
}

const filPiuma = {
  id: "yarn-1",
  name: "Fil Piuma",
  slug: "fil-piuma",
  weight: "dk" as const,
  meters: 400,
  grams: 150,
  brandName: "Katia",
  brandSlug: "katia",
};

describe("stashStockFromItems", () => {
  it("agrupa por grosor con los metros del catálogo", () => {
    const stock = stashStockFromItems([
      makeItem({
        yarnId: "yarn-1",
        yarn: filPiuma,
        skeins: 2,
        grams: 300,
        metersTotal: 800,
      }),
    ]);

    expect(stock).toEqual([
      { weight: "dk", meters: 800, hasMeters: true, items: 1 },
    ]);
  });

  it("estima los metros disponibles en proporción a lo asignado", () => {
    const stock = stashStockFromItems([
      makeItem({
        yarnId: "yarn-1",
        yarn: filPiuma,
        skeins: 2,
        metersTotal: 800,
        assignedSkeins: 1,
      }),
    ]);

    expect(stock[0]?.meters).toBe(400);
  });

  it("también proporcional cuando la asignación fue por gramos", () => {
    const stock = stashStockFromItems([
      makeItem({
        customName: "Merino de la feria",
        weight: "worsted",
        grams: 400,
        metersTotal: 500,
        assignedGrams: 100,
      }),
    ]);

    expect(stock[0]?.meters).toBe(375);
  });

  it("deja afuera lo que está todo asignado", () => {
    const stock = stashStockFromItems([
      makeItem({
        yarnId: "yarn-1",
        yarn: filPiuma,
        skeins: 1,
        metersTotal: 400,
        assignedSkeins: 1,
      }),
    ]);

    expect(stock).toEqual([]);
  });

  it("una carga libre sin metros aporta el grosor pero no el metraje", () => {
    const stock = stashStockFromItems([
      makeItem({ customName: "Lana de mi abuela", weight: "dk", skeins: 3 }),
    ]);

    expect(stock).toEqual([
      { weight: "dk", meters: 0, hasMeters: false, items: 1 },
    ]);
  });

  it("suma varias lanas del mismo grosor", () => {
    const stock = stashStockFromItems([
      makeItem({
        yarnId: "yarn-1",
        yarn: filPiuma,
        skeins: 2,
        metersTotal: 800,
      }),
      makeItem({ customName: "Restos", weight: "dk", grams: 100 }),
    ]);

    expect(stock).toEqual([
      { weight: "dk", meters: 800, hasMeters: true, items: 2 },
    ]);
  });

  it("deja afuera las lanas sin grosor", () => {
    const stock = stashStockFromItems([
      makeItem({ customName: "Sin grosor", skeins: 2, metersTotal: 300 }),
    ]);

    expect(stock).toEqual([]);
  });

  it("no se pasa de la proporción cuando hay más asignado que total", () => {
    const stock = stashStockFromItems([
      makeItem({
        yarnId: "yarn-1",
        yarn: filPiuma,
        skeins: 2,
        metersTotal: 800,
        assignedSkeins: 3,
      }),
    ]);

    expect(stock).toEqual([]);
  });
});
