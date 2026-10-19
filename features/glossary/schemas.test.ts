import { describe, expect, it } from "vitest";

import {
  filterGlossaryTerms,
  glossaryCountLabel,
  groupGlossaryTerms,
  parseGlossaryCraft,
} from "./schemas";
import type { GlossaryTermView } from "./queries";

/**
 * Reglas del glosario: filtros por técnica, búsqueda sin acentos (por nombre,
 * abreviatura, inglés, definición o variante de país) y agrupación por tipo.
 * `pnpm vitest run features/glossary/schemas.test.ts`.
 */

const terms: GlossaryTermView[] = [
  {
    slug: "punto-jersey",
    term: "Punto jersey",
    abbreviation: "",
    english: "stockinette stitch",
    variants: [{ country: "España", name: "punto liso" }],
    definition: "Una hilera al derecho y una al revés.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "dos-puntos-juntos",
    term: "Dos puntos juntos",
    abbreviation: "2 pj",
    english: "knit two together (k2tog)",
    variants: [],
    definition: "Se tejen dos puntos como si fueran uno.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "anillo-magico",
    term: "Anillo mágico",
    abbreviation: "am",
    english: "magic ring (MR)",
    variants: [],
    definition: "Círculo ajustable para arrancar amigurumis.",
    craft: "crochet",
    kind: "tecnica",
  },
  {
    slug: "bloqueo",
    term: "Bloqueo",
    abbreviation: "",
    english: "blocking",
    variants: [],
    definition: "Humectar y estirar la prenda terminada.",
    craft: "ambos",
    kind: "tecnica",
  },
];

const noFilters = { q: "", craft: null } as const;

describe("parseGlossaryCraft", () => {
  it("acepta solo las técnicas filtrables", () => {
    expect(parseGlossaryCraft("dos-agujas")).toBe("dos-agujas");
    expect(parseGlossaryCraft("crochet")).toBe("crochet");
    expect(parseGlossaryCraft("ambos")).toBeNull();
    expect(parseGlossaryCraft("")).toBeNull();
    expect(parseGlossaryCraft("telar")).toBeNull();
  });
});

describe("filterGlossaryTerms", () => {
  it("sin filtros devuelve todo, en el orden recibido", () => {
    expect(filterGlossaryTerms(terms, noFilters).map((t) => t.slug)).toEqual([
      "punto-jersey",
      "dos-puntos-juntos",
      "anillo-magico",
      "bloqueo",
    ]);
  });

  it("filtra por técnica e incluye los términos de ambas", () => {
    expect(
      filterGlossaryTerms(terms, { q: "", craft: "crochet" }).map(
        (t) => t.slug,
      ),
    ).toEqual(["anillo-magico", "bloqueo"]);
    expect(
      filterGlossaryTerms(terms, { q: "", craft: "dos-agujas" }).map(
        (t) => t.slug,
      ),
    ).toEqual(["punto-jersey", "dos-puntos-juntos", "bloqueo"]);
  });

  it("busca sin acentos ni mayúsculas", () => {
    expect(
      filterGlossaryTerms(terms, { q: "MÁGICO", craft: null }).map(
        (t) => t.slug,
      ),
    ).toEqual(["anillo-magico"]);
    expect(
      filterGlossaryTerms(terms, { q: "magico", craft: null }).map(
        (t) => t.slug,
      ),
    ).toEqual(["anillo-magico"]);
  });

  it("encuentra por abreviatura, inglés y variante de país", () => {
    expect(
      filterGlossaryTerms(terms, { q: "2 pj", craft: null }).map((t) => t.slug),
    ).toEqual(["dos-puntos-juntos"]);
    expect(
      filterGlossaryTerms(terms, { q: "k2tog", craft: null }).map(
        (t) => t.slug,
      ),
    ).toEqual(["dos-puntos-juntos"]);
    expect(
      filterGlossaryTerms(terms, { q: "liso", craft: null }).map((t) => t.slug),
    ).toEqual(["punto-jersey"]);
  });

  it("encuentra por definición y devuelve vacío si no hay nada", () => {
    expect(
      filterGlossaryTerms(terms, { q: "humectar", craft: null }).map(
        (t) => t.slug,
      ),
    ).toEqual(["bloqueo"]);
    expect(filterGlossaryTerms(terms, { q: "bufanda", craft: null })).toEqual(
      [],
    );
  });

  it("combina búsqueda y técnica", () => {
    expect(
      filterGlossaryTerms(terms, { q: "blo", craft: "crochet" }).map(
        (t) => t.slug,
      ),
    ).toEqual(["bloqueo"]);
    expect(
      filterGlossaryTerms(terms, { q: "blo", craft: "dos-agujas" }),
    ).toEqual(terms.filter((t) => t.slug === "bloqueo"));
  });
});

describe("groupGlossaryTerms", () => {
  it("arma las secciones de puntos y técnicas sin vacíos", () => {
    const sections = groupGlossaryTerms(terms);
    expect(sections.map((section) => section.kind)).toEqual([
      "punto",
      "tecnica",
    ]);
    expect(sections[0]?.terms.map((t) => t.slug)).toEqual([
      "punto-jersey",
      "dos-puntos-juntos",
    ]);
  });

  it("devuelve solo las secciones con contenido", () => {
    const onlyTechniques = groupGlossaryTerms(
      terms.filter((t) => t.kind === "tecnica"),
    );
    expect(onlyTechniques.map((section) => section.kind)).toEqual(["tecnica"]);
  });
});

describe("glossaryCountLabel", () => {
  it("cambia con la cantidad de términos", () => {
    expect(glossaryCountLabel(1)).toBe("1 término");
    expect(glossaryCountLabel(12)).toBe("12 términos");
  });
});
