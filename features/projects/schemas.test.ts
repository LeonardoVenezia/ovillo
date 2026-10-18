import { describe, expect, it } from "vitest";

import {
  emptyProjectValues,
  projectFormSchema,
  projectInputSchema,
  slugifyProjectName,
  splitTags,
  toProjectInput,
} from "./schemas";

describe("slugifyProjectName", () => {
  it("pasa a minúsculas, sin acentos ni símbolos", () => {
    expect(slugifyProjectName("Sweater de Otoño")).toBe("sweater-de-otono");
    expect(slugifyProjectName("Gorro ñandú")).toBe("gorro-nandu");
    expect(slugifyProjectName("Bufanda   para  mamá")).toBe(
      "bufanda-para-mama",
    );
  });

  it("limpia bordes y recorta largo", () => {
    expect(slugifyProjectName("  ¡Hola!  ")).toBe("hola");
    expect(slugifyProjectName("a".repeat(80))).toBe("a".repeat(60));
    // El recorte no deja guiones colgando.
    expect(slugifyProjectName(`${"x".repeat(59)} fin`)).toBe("x".repeat(59));
  });

  it("cae en un valor usable cuando no queda nada", () => {
    expect(slugifyProjectName("🧶🧶")).toBe("proyecto");
    expect(slugifyProjectName("")).toBe("proyecto");
  });
});

describe("splitTags", () => {
  it("separa por comas, saca espacios y descarta vacíos", () => {
    expect(splitTags("regalo, invierno ,, otoño ")).toEqual([
      "regalo",
      "invierno",
      "otoño",
    ]);
    expect(splitTags("")).toEqual([]);
  });
});

describe("projectInputSchema", () => {
  const base = {
    name: "Gorro azul",
    craft: "dos-agujas",
    status: "tejiendo",
    progress: 40,
    patternId: "",
    patternText: "",
    size: "",
    madeFor: "",
    startedAt: "",
    tags: [],
    notes: "",
    visibility: "publico",
  };

  it("acepta el mínimo: solo nombre", () => {
    const parsed = projectInputSchema.safeParse({
      ...base,
      craft: "",
      progress: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza nombre vacío, progreso fuera de rango y fechas raras", () => {
    expect(projectInputSchema.safeParse({ ...base, name: "   " }).success).toBe(
      false,
    );
    expect(
      projectInputSchema.safeParse({ ...base, progress: 101 }).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({ ...base, progress: -1 }).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({ ...base, startedAt: "17/10/2026" })
        .success,
    ).toBe(false);
  });

  it("rechaza más de 10 etiquetas o etiquetas largas", () => {
    expect(
      projectInputSchema.safeParse({
        ...base,
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
      }).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({ ...base, tags: ["a".repeat(25)] }).success,
    ).toBe(false);
  });

  it("acepta un patrón de la biblioteca y rechaza ids absurdamente largos", () => {
    expect(
      projectInputSchema.safeParse({ ...base, patternId: "abc123" }).success,
    ).toBe(true);
    expect(
      projectInputSchema.safeParse({ ...base, patternId: "x".repeat(65) })
        .success,
    ).toBe(false);
  });
});

describe("projectFormSchema y toProjectInput", () => {
  it("exige el nombre y convierte el resto a la forma de la acción", () => {
    expect(projectFormSchema.safeParse(emptyProjectValues).success).toBe(false);
    expect(toProjectInput(emptyProjectValues)).toMatchObject({
      name: "",
      craft: "",
      progress: null,
      startedAt: "",
      tags: [],
    });
    expect(
      projectFormSchema.safeParse({
        ...emptyProjectValues,
        name: "Gorro azul",
      }).success,
    ).toBe(true);
  });

  it("convierte progreso y etiquetas de texto", () => {
    const values = {
      ...emptyProjectValues,
      name: "Medias",
      progress: "75",
      tagsText: "regalo, invierno",
    };
    expect(toProjectInput(values)).toMatchObject({
      progress: 75,
      tags: ["regalo", "invierno"],
    });
  });

  it("rechaza progreso inválido en el formulario", () => {
    const base = { ...emptyProjectValues, name: "Medias" };
    expect(
      projectFormSchema.safeParse({ ...base, progress: "120" }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({ ...base, progress: "abc" }).success,
    ).toBe(false);
    expect(
      projectFormSchema.safeParse({ ...base, progress: "40" }).success,
    ).toBe(true);
  });
});
