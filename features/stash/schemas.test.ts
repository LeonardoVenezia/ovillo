import { describe, expect, it } from "vitest";

import {
  parseCountInput,
  stashItemSchema,
  STASH_GRAMS_MAX,
  STASH_METERS_MAX,
  suggestCatalogAmounts,
} from "./schemas";

describe("parseCountInput", () => {
  it("lee enteros, con espacios y con punto de miles", () => {
    expect(parseCountInput("3")).toBe(3);
    expect(parseCountInput(" 12 ")).toBe(12);
    expect(parseCountInput("1.500")).toBe(1500);
  });

  it("vacío no es un número, es campo por completar", () => {
    expect(parseCountInput("")).toBe(null);
    expect(parseCountInput("   ")).toBe(null);
  });

  it("rechaza decimales, negativos y texto", () => {
    expect(parseCountInput("2,5")).toBe("invalid");
    expect(parseCountInput("1.50")).toBe("invalid");
    expect(parseCountInput("-2")).toBe("invalid");
    expect(parseCountInput("0")).toBe("invalid");
    expect(parseCountInput("abc")).toBe("invalid");
  });
});

describe("stashItemSchema", () => {
  it("acepta una carga libre mínima", () => {
    const parsed = stashItemSchema.parse({
      customName: "Lana de mi abuela",
      skeins: 3,
    });
    expect(parsed.customName).toBe("Lana de mi abuela");
    expect(parsed.skeins).toBe(3);
    expect(parsed.yarnId).toBe(null);
    expect(parsed.weight).toBe(null);
    expect(parsed.colorFamily).toBe(null);
    expect(parsed.metersTotal).toBe(null);
  });

  it("acepta una lana del catálogo con solo gramos", () => {
    const parsed = stashItemSchema.parse({ yarnId: "y1", grams: 80 });
    expect(parsed.yarnId).toBe("y1");
    expect(parsed.grams).toBe(80);
  });

  it("pide nombre en las cargas libres", () => {
    const result = stashItemSchema.safeParse({ skeins: 2 });
    expect(result.success).toBe(false);
  });

  it("pide al menos una cantidad", () => {
    const result = stashItemSchema.safeParse({
      customName: "Sin cantidad",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza cantidades fuera de rango", () => {
    expect(stashItemSchema.safeParse({ yarnId: "y1", skeins: 0 }).success).toBe(
      false,
    );
    expect(
      stashItemSchema.safeParse({ yarnId: "y1", skeins: 501 }).success,
    ).toBe(false);
    expect(
      stashItemSchema.safeParse({ yarnId: "y1", grams: STASH_GRAMS_MAX + 1 })
        .success,
    ).toBe(false);
  });

  it("recorta los textos y deja pasar los nulos", () => {
    const parsed = stashItemSchema.parse({
      yarnId: "y1",
      skeins: 1,
      colorway: "  Rojo coral ",
      location: null,
    });
    expect(parsed.colorway).toBe("Rojo coral");
    expect(parsed.location).toBe(null);
  });
});

describe("suggestCatalogAmounts", () => {
  it("completa gramos y metros desde la etiqueta del catálogo", () => {
    const result = suggestCatalogAmounts({
      skeins: 3,
      grams: null,
      metersTotal: null,
      yarn: { meters: 150, grams: 100 },
    });
    expect(result.grams).toBe(300);
    expect(result.metersTotal).toBe(450);
  });

  it("no pisa lo que la persona ya escribió", () => {
    const result = suggestCatalogAmounts({
      skeins: 3,
      grams: 250,
      metersTotal: 500,
      yarn: { meters: 150, grams: 100 },
    });
    expect(result.grams).toBe(250);
    expect(result.metersTotal).toBe(500);
  });

  it("sin ovillos o sin lana del catálogo no toca nada", () => {
    expect(
      suggestCatalogAmounts({
        skeins: null,
        grams: null,
        metersTotal: null,
        yarn: { meters: 150, grams: 100 },
      }),
    ).toEqual({ grams: null, metersTotal: null });

    expect(
      suggestCatalogAmounts({
        skeins: 4,
        grams: null,
        metersTotal: null,
        yarn: null,
      }),
    ).toEqual({ grams: null, metersTotal: null });
  });

  it("recorta a los topes de la columna", () => {
    const result = suggestCatalogAmounts({
      skeins: 500,
      grams: null,
      metersTotal: null,
      yarn: { meters: 20_000, grams: 2_000 },
    });
    expect(result.metersTotal).toBe(STASH_METERS_MAX);
    expect(result.grams).toBe(STASH_GRAMS_MAX);
  });
});
