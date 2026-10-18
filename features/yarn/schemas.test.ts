import { describe, expect, it } from "vitest";

import { YARN_FIBERS, YARN_WEIGHTS } from "@/db/yarn-schema";
import { es } from "@/messages/es";

import {
  emptyYarnForm,
  parseYarnForm,
  yarnInputSchema,
  yarnUpdateSchema,
  type YarnFormState,
} from "./schemas";
import { formatComposition, formatNeedles, formatSkein } from "./format";

/** Formulario completo y válido, para retocar por prueba. */
function formState(overrides: Partial<YarnFormState> = {}): YarnFormState {
  return {
    ...emptyYarnForm,
    brandChoice: "brand-1",
    name: "Súper Seda",
    weight: "dk",
    gramsText: "100",
    metersText: "200",
    ...overrides,
  };
}

describe("yarnInputSchema", () => {
  const minimal = {
    brandId: "brand-1",
    name: "Súper Seda",
    weight: "dk",
    fiber: [{ fiber: "merino", percent: 100 }],
  };

  it("acepta lo mínimo y completa los opcionales", () => {
    const parsed = yarnInputSchema.parse(minimal);
    expect(parsed).toEqual({
      brandId: "brand-1",
      brandName: "",
      brandCountry: "",
      name: "Súper Seda",
      weight: "dk",
      fiber: [{ fiber: "merino", percent: 100 }],
      grams: null,
      meters: null,
      needleMmMin: null,
      needleMmMax: null,
    });
  });

  it("acepta marca nueva con país, ovillo y agujas", () => {
    const parsed = yarnInputSchema.parse({
      ...minimal,
      brandId: null,
      brandName: "LHO",
      brandCountry: "AR",
      grams: 100,
      meters: 220,
      needleMmMin: 3.5,
      needleMmMax: 4.5,
    });
    expect(parsed.brandId).toBe(null);
    expect(parsed.brandName).toBe("LHO");
    expect(parsed.needleMmMin).toBe(3.5);
  });

  it("pide marca: ni id ni nombre no alcanza", () => {
    const parsed = yarnInputSchema.safeParse({
      ...minimal,
      brandId: null,
      brandName: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("la composición tiene que sumar 100", () => {
    const parsed = yarnInputSchema.safeParse({
      ...minimal,
      fiber: [
        { fiber: "algodon", percent: 60 },
        { fiber: "poliamida", percent: 30 },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza porcentajes imposibles y listas vacías", () => {
    expect(
      yarnInputSchema.safeParse({
        ...minimal,
        fiber: [{ fiber: "merino", percent: 0 }],
      }).success,
    ).toBe(false);
    expect(yarnInputSchema.safeParse({ ...minimal, fiber: [] }).success).toBe(
      false,
    );
  });

  it("rechaza fibras y grosores fuera del vocabulario", () => {
    expect(
      yarnInputSchema.safeParse({
        ...minimal,
        fiber: [{ fiber: "plastico", percent: 100 }],
      }).success,
    ).toBe(false);
    expect(
      yarnInputSchema.safeParse({ ...minimal, weight: "gordita" }).success,
    ).toBe(false);
  });

  it("valida el ovillo y las agujas", () => {
    expect(yarnInputSchema.safeParse({ ...minimal, grams: 0 }).success).toBe(
      false,
    );
    expect(yarnInputSchema.safeParse({ ...minimal, grams: 2001 }).success).toBe(
      false,
    );
    expect(
      yarnInputSchema.safeParse({ ...minimal, meters: 20001 }).success,
    ).toBe(false);
    expect(
      yarnInputSchema.safeParse({ ...minimal, needleMmMin: 3.3 }).success,
    ).toBe(false);
    expect(
      yarnInputSchema.safeParse({
        ...minimal,
        needleMmMin: 5,
        needleMmMax: 4,
      }).success,
    ).toBe(false);
    expect(
      yarnInputSchema.safeParse({
        ...minimal,
        needleMmMin: 3.75,
        needleMmMax: 3.75,
      }).success,
    ).toBe(true);
  });

  it("la edición pide el id", () => {
    expect(
      yarnUpdateSchema.safeParse({ ...minimal, id: "yarn-1" }).success,
    ).toBe(true);
    expect(yarnUpdateSchema.safeParse(minimal).success).toBe(false);
  });
});

describe("parseYarnForm", () => {
  it("convierte un formulario completo", () => {
    const result = parseYarnForm(
      formState({
        fibers: [
          { fiber: "algodon", percentText: "60" },
          { fiber: "poliamida", percentText: "40" },
        ],
        needleMinText: "3,5",
        needleMaxText: "4.5",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.grams).toBe(100);
      expect(result.input.meters).toBe(200);
      expect(result.input.needleMmMin).toBe(3.5);
      expect(result.input.needleMmMax).toBe(4.5);
      expect(result.input.fiber).toEqual([
        { fiber: "algodon", percent: 60 },
        { fiber: "poliamida", percent: 40 },
      ]);
    }
  });

  it("marca nueva: la usa cuando se elige «otra»", () => {
    const result = parseYarnForm(
      formState({
        brandChoice: "otra",
        brandName: "Hilazas Diana",
        brandCountry: "CO",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.input.brandId).toBe(null);
      expect(result.input.brandName).toBe("Hilazas Diana");
      expect(result.input.brandCountry).toBe("CO");
    }
  });

  it("señala lo que falta campo por campo", () => {
    // Zod v4 saltea las reglas que cruzan campos cuando un campo base falla:
    // los avisos llegan de a uno, que es lo que la persona necesita para
    // avanzar.
    const noBrand = parseYarnForm(formState({ brandChoice: "" }));
    expect(noBrand.ok).toBe(false);
    if (!noBrand.ok) {
      expect(noBrand.errors.brand).toBe(es.yarns.errors.brandRequired);
    }

    const noName = parseYarnForm(formState({ name: "" }));
    expect(noName.ok).toBe(false);
    if (!noName.ok) {
      expect(noName.errors.name).toBe(es.yarns.errors.nameRequired);
    }

    const noWeight = parseYarnForm(formState({ weight: "" }));
    expect(noWeight.ok).toBe(false);
    if (!noWeight.ok) {
      expect(noWeight.errors.weight).toBe(es.yarns.errors.weightRequired);
    }

    const badSum = parseYarnForm(
      formState({ fibers: [{ fiber: "lana", percentText: "80" }] }),
    );
    expect(badSum.ok).toBe(false);
    if (!badSum.ok) {
      expect(badSum.errors.fiber).toBe(es.yarns.errors.fiberSum);
    }
  });

  it("lee mal lo que no es número", () => {
    const result = parseYarnForm(
      formState({ gramsText: "cien", needleMinText: "3,3" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.grams).toBe(es.yarns.errors.gramsRange);
      expect(result.errors.needles).toBe(es.yarns.errors.needlesInvalid);
    }
  });

  it("la composición vacía pide al menos una fibra", () => {
    const result = parseYarnForm(formState({ fibers: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.fiber).toBe(es.yarns.errors.fiberRequired);
    }
  });
});

describe("formatos", () => {
  it("la composición se lee con porcentajes", () => {
    expect(
      formatComposition([
        { fiber: "algodon", percent: 60 },
        { fiber: "poliamida", percent: 40 },
      ]),
    ).toBe("60% algodón · 40% poliamida (nylon)");
  });

  it("el ovillo muestra lo que hay", () => {
    expect(formatSkein(100, 200)).toBe("100 g · 200 m");
    expect(formatSkein(50, null)).toBe("50 g");
    expect(formatSkein(null, 400)).toBe("400 m");
    expect(formatSkein(null, null)).toBe(null);
  });

  it("las agujas se muestran como rango o valor suelto", () => {
    expect(formatNeedles(3.5, 4.5)).toBe("3,5–4,5 mm");
    expect(formatNeedles(4, 4)).toBe("4 mm");
    expect(formatNeedles(null, 5)).toBe("5 mm");
    expect(formatNeedles(null, null)).toBe(null);
  });

  it("todo grosor y toda fibra tienen su texto en español", () => {
    for (const weight of YARN_WEIGHTS) {
      expect(es.yarns.weights[weight].length).toBeGreaterThan(0);
    }
    for (const fiber of YARN_FIBERS) {
      expect(es.yarns.fibers[fiber].length).toBeGreaterThan(0);
    }
  });
});
