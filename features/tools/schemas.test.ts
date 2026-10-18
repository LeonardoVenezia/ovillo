import { describe, expect, it } from "vitest";

import {
  isQuarterStepMm,
  parseSizeMmInput,
  TOOL_NOTES_MAX,
  TOOL_SIZE_MM_MAX,
  TOOL_SIZE_MM_MIN,
  toolCreateSchema,
  toolUpdateSchema,
} from "./schemas";
import {
  CROCHET_HOOK_SIZES,
  equivalenceLabel,
  formatMm,
  hookEquivalence,
  KNITTING_NEEDLE_SIZES,
  needleEquivalence,
} from "./sizes";

describe("isQuarterStepMm", () => {
  it("acepta la grilla real de medidas", () => {
    expect(isQuarterStepMm(0.5)).toBe(true);
    expect(isQuarterStepMm(2.25)).toBe(true);
    expect(isQuarterStepMm(3.5)).toBe(true);
    expect(isQuarterStepMm(12.75)).toBe(true);
  });

  it("rechaza medidas fuera de la grilla o imposibles", () => {
    expect(isQuarterStepMm(3.3)).toBe(false);
    expect(isQuarterStepMm(4.1)).toBe(false);
    expect(isQuarterStepMm(Number.NaN)).toBe(false);
    expect(isQuarterStepMm(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("parseSizeMmInput", () => {
  it("lee enteros y decimales con coma o punto", () => {
    expect(parseSizeMmInput("4")).toBe(4);
    expect(parseSizeMmInput("3,5")).toBe(3.5);
    expect(parseSizeMmInput(" 2.25 ")).toBe(2.25);
  });

  it("vacío no es un número, es campo por completar", () => {
    expect(parseSizeMmInput("")).toBe(null);
    expect(parseSizeMmInput("   ")).toBe(null);
  });

  it("rechaza lo que no es una medida real", () => {
    expect(parseSizeMmInput("abc")).toBe("invalid");
    expect(parseSizeMmInput("0,4")).toBe("invalid");
    expect(parseSizeMmInput("26")).toBe("invalid");
    expect(parseSizeMmInput("3,3")).toBe("invalid");
  });
});

describe("toolCreateSchema", () => {
  it("acepta lo mínimo y completa los opcionales", () => {
    const parsed = toolCreateSchema.parse({ kind: "rectas", sizeMm: 4 });
    expect(parsed).toEqual({
      kind: "rectas",
      sizeMm: 4,
      material: null,
      lengthCm: null,
      quantity: 1,
      notes: null,
    });
  });

  it("acepta una circular completa", () => {
    const parsed = toolCreateSchema.parse({
      kind: "circulares",
      sizeMm: 3.5,
      material: "madera",
      lengthCm: 80,
      quantity: 2,
      notes: "las de mi mamá",
    });
    expect(parsed.lengthCm).toBe(80);
    expect(parsed.material).toBe("madera");
  });

  it("rechaza tipo, medida, cable y cantidad fuera de rango", () => {
    expect(
      toolCreateSchema.safeParse({ kind: "palillos", sizeMm: 4 }).success,
    ).toBe(false);
    expect(
      toolCreateSchema.safeParse({ kind: "rectas", sizeMm: 3.3 }).success,
    ).toBe(false);
    expect(
      toolCreateSchema.safeParse({ kind: "rectas", sizeMm: TOOL_SIZE_MM_MAX + 1 })
        .success,
    ).toBe(false);
    expect(
      toolCreateSchema.safeParse({ kind: "rectas", sizeMm: TOOL_SIZE_MM_MIN / 2 })
        .success,
    ).toBe(false);
    expect(
      toolCreateSchema.safeParse({
        kind: "circulares",
        sizeMm: 4,
        lengthCm: 5,
      }).success,
    ).toBe(false);
    expect(
      toolCreateSchema.safeParse({ kind: "rectas", sizeMm: 4, quantity: 0 })
        .success,
    ).toBe(false);
    expect(
      toolCreateSchema.safeParse({ kind: "rectas", sizeMm: 4, quantity: 100 })
        .success,
    ).toBe(false);
  });

  it("rechaza notas largas y materiales desconocidos", () => {
    expect(
      toolCreateSchema.safeParse({
        kind: "rectas",
        sizeMm: 4,
        notes: "x".repeat(TOOL_NOTES_MAX + 1),
      }).success,
    ).toBe(false);
    expect(
      toolCreateSchema.safeParse({
        kind: "rectas",
        sizeMm: 4,
        material: "hueso",
      }).success,
    ).toBe(false);
  });

  it("la edición pide el id", () => {
    expect(
      toolUpdateSchema.safeParse({ id: "abc", kind: "gancho", sizeMm: 5 })
        .success,
    ).toBe(true);
    expect(
      toolUpdateSchema.safeParse({ kind: "gancho", sizeMm: 5 }).success,
    ).toBe(false);
  });
});

describe("formatMm", () => {
  it("usa coma decimal y no arrastra ceros de más", () => {
    expect(formatMm(4)).toBe("4");
    expect(formatMm(3.5)).toBe("3,5");
    expect(formatMm(2.25)).toBe("2,25");
    expect(formatMm(12.75)).toBe("12,75");
  });
});

describe("tablas de equivalencias", () => {
  it("las tablas están ordenadas, sin repetidas y dentro de la grilla", () => {
    for (const size of KNITTING_NEEDLE_SIZES) {
      expect(isQuarterStepMm(size.mm)).toBe(true);
      expect(size.mm).toBeGreaterThanOrEqual(TOOL_SIZE_MM_MIN);
      expect(size.mm).toBeLessThanOrEqual(TOOL_SIZE_MM_MAX);
      if (size.us !== null) {
        expect(size.us.length).toBeGreaterThan(0);
      }
      if (size.uk !== null) {
        expect(size.uk.length).toBeGreaterThan(0);
      }
    }
    const needleSizes = KNITTING_NEEDLE_SIZES.map((size) => size.mm);
    expect(new Set(needleSizes).size).toBe(needleSizes.length);
    expect([...needleSizes].sort((a, b) => a - b)).toEqual(needleSizes);

    for (const size of CROCHET_HOOK_SIZES) {
      expect(isQuarterStepMm(size.mm)).toBe(true);
      expect(size.us.length).toBeGreaterThan(0);
    }
    const hookSizes = CROCHET_HOOK_SIZES.map((size) => size.mm);
    expect(new Set(hookSizes).size).toBe(hookSizes.length);
    expect([...hookSizes].sort((a, b) => a - b)).toEqual(hookSizes);
  });

  it("encuentra las equivalencias de manual", () => {
    expect(needleEquivalence(4)).toEqual({ mm: 4, us: "6", uk: "8" });
    expect(needleEquivalence(3.25)).toEqual({ mm: 3.25, us: "3", uk: "10" });
    expect(hookEquivalence(4)).toEqual({ mm: 4, us: "G-6" });
  });

  it("no inventa equivalencias fuera de la tabla", () => {
    expect(needleEquivalence(4.25)).toBe(null);
    expect(hookEquivalence(5.25)).toBe(null);
  });
});

describe("equivalenceLabel", () => {
  it("arma la línea de agujas con US y UK cuando existen", () => {
    expect(equivalenceLabel("rectas", 3)).toBe("US 2½ · UK 11");
    expect(equivalenceLabel("circulares", 4)).toBe("US 6 · UK 8");
  });

  it("si solo existe una numeración, muestra esa", () => {
    expect(equivalenceLabel("doble-punta", 7)).toBe("UK 2");
    expect(equivalenceLabel("rectas", 2.5)).toBe("US 1½");
  });

  it("los ganchos usan la tabla de letras", () => {
    expect(equivalenceLabel("gancho", 5)).toBe("US H-8");
    expect(equivalenceLabel("gancho", 5.25)).toBe(null);
    expect(equivalenceLabel("rectas", 4.25)).toBe(null);
  });
});
