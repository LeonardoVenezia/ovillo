import { describe, expect, it } from "vitest";

import {
  buildYearSummary,
  formatCount,
  usageGrams,
  usageMeters,
  type YearProject,
  type YearUsage,
} from "./summary";

/**
 * El resumen anual es el corazón de "Mi año tejiendo": acá se prueban los
 * caminos de estimación (ovillos, gramos, datos incompletos) y la elección de
 * la lana más usada. `pnpm vitest run features/goal/summary.test.ts`.
 */

function usage(overrides: Partial<YearUsage> = {}): YearUsage {
  return {
    yarnKey: "yarn:1",
    label: "Fil Piuma · Katia",
    skeinsUsed: null,
    gramsUsed: null,
    metersPerSkein: 400,
    gramsPerSkein: 150,
    metersPerGram: 400 / 150,
    ...overrides,
  };
}

function project(
  finishedAt: string,
  usages: YearUsage[],
  id = finishedAt,
): YearProject {
  return { id, finishedAt, usages };
}

describe("usageMeters", () => {
  it("multiplica ovillos por los metros del ovillo", () => {
    expect(usageMeters(usage({ skeinsUsed: 2 }))).toBe(800);
  });

  it("usa la proporción metros ÷ gramos cuando el uso está en gramos", () => {
    expect(usageMeters(usage({ gramsUsed: 75 }))).toBeCloseTo(200, 6);
  });

  it("sin metros por ovillo no inventa metros", () => {
    expect(
      usageMeters(
        usage({
          skeinsUsed: 1,
          metersPerSkein: null,
          metersPerGram: null,
        }),
      ),
    ).toBeNull();
  });

  it("sin metros por gramo no puede convertir gramos a metros", () => {
    expect(
      usageMeters(usage({ gramsUsed: 100, metersPerGram: null })),
    ).toBeNull();
  });
});

describe("usageGrams", () => {
  it("prefiere los gramos anotados", () => {
    expect(usageGrams(usage({ gramsUsed: 120, skeinsUsed: 3 }))).toBe(120);
  });

  it("deriva gramos de los ovillos cuando hay gramos por ovillo", () => {
    expect(usageGrams(usage({ skeinsUsed: 4 }))).toBe(600);
  });

  it("sin datos de gramos queda en null", () => {
    expect(
      usageGrams(usage({ skeinsUsed: 1, gramsPerSkein: null })),
    ).toBeNull();
  });
});

describe("buildYearSummary", () => {
  it("cuenta solo los proyectos terminados en el año pedido", () => {
    const summary = buildYearSummary(
      [
        project("2026-03-10", [usage({ skeinsUsed: 1 })]),
        project("2025-12-30", [usage({ skeinsUsed: 9 })], "viejo"),
        project("2026-08-01", [], "sin-lanas"),
      ],
      2026,
    );

    expect(summary.finishedCount).toBe(2);
    expect(summary.totalMeters).toBe(400);
    expect(summary.totalGrams).toBe(150);
  });

  it("suma varios proyectos y elige la lana más usada por metros", () => {
    const summary = buildYearSummary(
      [
        project("2026-01-15", [
          usage({ skeinsUsed: 1 }),
          usage({
            yarnKey: "stash:9",
            label: "Lana de mi abuela",
            skeinsUsed: 2,
            metersPerSkein: 210,
            gramsPerSkein: 100,
          }),
        ]),
        project("2026-06-20", [
          usage({
            yarnKey: "stash:9",
            label: "Lana de mi abuela",
            skeinsUsed: 3,
            metersPerSkein: 210,
            gramsPerSkein: 100,
          }),
        ]),
      ],
      2026,
    );

    expect(summary.finishedCount).toBe(2);
    expect(summary.totalMeters).toBe(400 + 420 + 630);
    expect(summary.totalGrams).toBe(150 + 200 + 300);
    expect(summary.topYarn).toEqual({
      label: "Lana de mi abuela",
      meters: 1050,
      grams: 500,
    });
  });

  it("con una sola lana sin metros, la más usada queda en gramos", () => {
    const summary = buildYearSummary(
      [
        project("2026-02-02", [
          usage({
            label: "Restos de algodón",
            gramsUsed: 180,
            metersPerSkein: null,
            gramsPerSkein: null,
            metersPerGram: null,
          }),
        ]),
      ],
      2026,
    );

    expect(summary.totalMeters).toBeNull();
    expect(summary.totalGrams).toBe(180);
    expect(summary.topYarn).toEqual({
      label: "Restos de algodón",
      meters: null,
      grams: 180,
    });
  });

  it("ignora las lanas sin ningún dato derivable", () => {
    const summary = buildYearSummary(
      [
        project("2026-04-04", [
          usage({
            skeinsUsed: 2,
            metersPerSkein: null,
            gramsPerSkein: null,
          }),
        ]),
      ],
      2026,
    );

    expect(summary.finishedCount).toBe(1);
    expect(summary.totalMeters).toBeNull();
    expect(summary.totalGrams).toBeNull();
    expect(summary.topYarn).toBeNull();
  });

  it("sin proyectos terminados queda todo en cero", () => {
    const summary = buildYearSummary(
      [project("2026-01-01", [], "en-curso")],
      2026,
    );

    expect(summary.finishedCount).toBe(1);
    expect(summary.topYarn).toBeNull();
  });

  it("desempata la lana más usada por gramos y después por nombre", () => {
    const empatePorGramos = buildYearSummary(
      [
        project("2026-05-05", [
          usage({
            yarnKey: "a",
            label: "Primera",
            skeinsUsed: 1,
            metersPerSkein: 200,
            gramsPerSkein: 120,
          }),
          usage({
            yarnKey: "b",
            label: "Segunda",
            skeinsUsed: 1,
            metersPerSkein: 200,
            gramsPerSkein: 100,
          }),
        ]),
      ],
      2026,
    );
    expect(empatePorGramos.topYarn?.label).toBe("Primera");

    const empateTotal = buildYearSummary(
      [
        project("2026-05-05", [
          usage({
            yarnKey: "a",
            label: "Zeta",
            skeinsUsed: 1,
            metersPerSkein: 200,
            gramsPerSkein: 100,
          }),
          usage({
            yarnKey: "b",
            label: "Alfa",
            skeinsUsed: 1,
            metersPerSkein: 200,
            gramsPerSkein: 100,
          }),
        ]),
      ],
      2026,
    );
    expect(empateTotal.topYarn?.label).toBe("Alfa");
  });
});

describe("formatCount", () => {
  it("usa punto de miles", () => {
    expect(formatCount(1200)).toBe("1.200");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1234567)).toBe("1.234.567");
  });
});
