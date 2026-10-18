import { describe, expect, it } from "vitest";

import { PATTERN_CATEGORIES, PATTERN_LANGUAGES } from "@/db/pattern-schema";
import { es } from "@/messages/es";

import { categoryLabel, difficultyLabel, formatYardage } from "./format";
import {
  emptyPatternForm,
  parsePatternForm,
  patternInputSchema,
  patternUpdateSchema,
  type PatternFormState,
} from "./schemas";

/** Formulario completo y válido, para retocar por prueba. */
function formState(
  overrides: Partial<PatternFormState> = {},
): PatternFormState {
  return {
    ...emptyPatternForm,
    name: "Gorro Beanie Oso",
    designerName: "Katia",
    sourceUrl: "https://www.katia.com/ES/mujer-gorro-8044-378.html",
    craft: "dos-agujas",
    category: "accesorios",
    ...overrides,
  };
}

describe("patternInputSchema", () => {
  const minimal = {
    name: "Gorro Beanie Oso",
    sourceUrl: "https://www.katia.com/ES/mujer-gorro-8044-378.html",
    craft: "dos-agujas",
    category: "accesorios",
    language: "es",
  };

  it("acepta lo mínimo y completa los opcionales", () => {
    const parsed = patternInputSchema.parse(minimal);
    expect(parsed).toEqual({
      name: "Gorro Beanie Oso",
      sourceUrl: "https://www.katia.com/ES/mujer-gorro-8044-378.html",
      craft: "dos-agujas",
      category: "accesorios",
      language: "es",
      designerName: "",
      difficulty: null,
      weight: "",
      yardageMin: null,
      yardageMax: null,
      needleSizes: "",
      gauge: "",
      sizes: "",
    });
  });

  it("acepta un patrón completo", () => {
    const parsed = patternInputSchema.parse({
      ...minimal,
      designerName: "Santa Pazienzia",
      difficulty: 3,
      weight: "dk",
      yardageMin: 1200,
      yardageMax: 1500,
      needleSizes: "4,5 mm",
      gauge: "20 puntos × 26 vueltas = 10 cm",
      sizes: "S a XL",
      language: "en",
    });
    expect(parsed.difficulty).toBe(3);
    expect(parsed.weight).toBe("dk");
    expect(parsed.yardageMin).toBe(1200);
  });

  it("pide nombre y enlace navegable", () => {
    expect(patternInputSchema.safeParse({ ...minimal, name: "" }).success).toBe(
      false,
    );
    expect(
      patternInputSchema.safeParse({ ...minimal, sourceUrl: "" }).success,
    ).toBe(false);
    expect(
      patternInputSchema.safeParse({
        ...minimal,
        sourceUrl: "www.katia.com/patron",
      }).success,
    ).toBe(false);
    expect(
      patternInputSchema.safeParse({
        ...minimal,
        sourceUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("rechaza técnica, categoría, idioma y grosor fuera del vocabulario", () => {
    expect(
      patternInputSchema.safeParse({ ...minimal, craft: "bordado" }).success,
    ).toBe(false);
    expect(
      patternInputSchema.safeParse({ ...minimal, category: "comida" }).success,
    ).toBe(false);
    expect(
      patternInputSchema.safeParse({ ...minimal, language: "fr" }).success,
    ).toBe(false);
    expect(
      patternInputSchema.safeParse({ ...minimal, weight: "gordita" }).success,
    ).toBe(false);
  });

  it("la dificultad va de 1 a 5, o sin decir", () => {
    expect(
      patternInputSchema.safeParse({ ...minimal, difficulty: 0 }).success,
    ).toBe(false);
    expect(
      patternInputSchema.safeParse({ ...minimal, difficulty: 6 }).success,
    ).toBe(false);
    expect(
      patternInputSchema.safeParse({ ...minimal, difficulty: null }).success,
    ).toBe(true);
  });

  it("el metraje es un rango coherente", () => {
    expect(
      patternInputSchema.safeParse({
        ...minimal,
        yardageMin: 1500,
        yardageMax: 1200,
      }).success,
    ).toBe(false);
    expect(
      patternInputSchema.safeParse({
        ...minimal,
        yardageMin: 1200,
        yardageMax: 1200,
      }).success,
    ).toBe(true);
    expect(
      patternInputSchema.safeParse({ ...minimal, yardageMin: 0 }).success,
    ).toBe(false);
    expect(
      patternInputSchema.safeParse({ ...minimal, yardageMax: 50001 }).success,
    ).toBe(false);
  });

  it("la edición pide el id", () => {
    expect(
      patternUpdateSchema.safeParse({ ...minimal, id: "pattern-1" }).success,
    ).toBe(true);
    expect(patternUpdateSchema.safeParse(minimal).success).toBe(false);
  });
});

describe("parsePatternForm", () => {
  it("convierte un formulario completo", () => {
    const result = parsePatternForm(
      formState({
        difficulty: "3",
        weight: "dk",
        yardageMinText: "1200",
        yardageMaxText: "1500",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.difficulty).toBe(3);
      expect(result.input.weight).toBe("dk");
      expect(result.input.yardageMin).toBe(1200);
      expect(result.input.yardageMax).toBe(1500);
    }
  });

  it("sin dificultad ni metraje queda todo en null", () => {
    const result = parsePatternForm(formState());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.difficulty).toBe(null);
      expect(result.input.yardageMin).toBe(null);
      expect(result.input.yardageMax).toBe(null);
    }
  });

  it("señala lo que falta campo por campo", () => {
    // Zod v4 saltea las reglas que cruzan campos cuando un campo base falla:
    // los avisos llegan de a uno, que es lo que la persona necesita para
    // avanzar.
    const noName = parsePatternForm(formState({ name: "" }));
    expect(noName.ok).toBe(false);
    if (!noName.ok) {
      expect(noName.errors.name).toBe(es.patterns.errors.nameRequired);
    }

    const noSource = parsePatternForm(formState({ sourceUrl: "" }));
    expect(noSource.ok).toBe(false);
    if (!noSource.ok) {
      expect(noSource.errors.source).toBe(es.patterns.errors.sourceRequired);
    }

    const badSource = parsePatternForm(
      formState({ sourceUrl: "katia.com/patron" }),
    );
    expect(badSource.ok).toBe(false);
    if (!badSource.ok) {
      expect(badSource.errors.source).toBe(es.patterns.errors.sourceInvalid);
    }

    const noCraft = parsePatternForm(formState({ craft: "" }));
    expect(noCraft.ok).toBe(false);
    if (!noCraft.ok) {
      expect(noCraft.errors.craft).toBe(es.patterns.errors.craftRequired);
    }

    const noCategory = parsePatternForm(formState({ category: "" }));
    expect(noCategory.ok).toBe(false);
    if (!noCategory.ok) {
      expect(noCategory.errors.category).toBe(
        es.patterns.errors.categoryRequired,
      );
    }
  });

  it("lee mal lo que no es número", () => {
    const badYardage = parsePatternForm(
      formState({ yardageMinText: "mil", yardageMaxText: "1200" }),
    );
    expect(badYardage.ok).toBe(false);
    if (!badYardage.ok) {
      expect(badYardage.errors.yardage).toBe(es.patterns.errors.yardageRange);
    }

    const badDifficulty = parsePatternForm(formState({ difficulty: "9" }));
    expect(badDifficulty.ok).toBe(false);
    if (!badDifficulty.ok) {
      expect(badDifficulty.errors.difficulty).toBe(
        es.patterns.errors.difficultyRange,
      );
    }
  });

  it("el «hasta» no puede ser menor que el «desde»", () => {
    const result = parsePatternForm(
      formState({ yardageMinText: "1500", yardageMaxText: "1200" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.yardage).toBe(es.patterns.errors.yardageOrder);
    }
  });
});

describe("formatos", () => {
  it("el metraje se muestra como rango, valor suelto o desde/hasta", () => {
    expect(formatYardage(1200, 1500)).toBe("1200–1500 m");
    expect(formatYardage(900, 900)).toBe("900 m");
    expect(formatYardage(800, null)).toBe("Desde 800 m");
    expect(formatYardage(null, 1200)).toBe("Hasta 1200 m");
    expect(formatYardage(null, null)).toBe(null);
  });

  it("la dificultad se lee con etiqueta y número", () => {
    expect(difficultyLabel(1)).toBe("Muy fácil");
    expect(difficultyLabel(3)).toBe("Intermedia");
    expect(difficultyLabel(5)).toBe("Muy difícil");
  });

  it("toda categoría y todo idioma tienen su texto en español", () => {
    for (const category of PATTERN_CATEGORIES) {
      expect(categoryLabel(category).length).toBeGreaterThan(0);
    }
    for (const language of PATTERN_LANGUAGES) {
      expect(es.patterns.languages[language].length).toBeGreaterThan(0);
    }
    for (const value of [1, 2, 3, 4, 5] as const) {
      expect(es.patterns.difficulties[value].length).toBeGreaterThan(0);
    }
  });
});
