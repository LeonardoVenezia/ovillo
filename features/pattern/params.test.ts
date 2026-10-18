import { describe, expect, it } from "vitest";

import {
  isPatternOrder,
  parseDifficulty,
  parseLanguage,
  parseYardageBucket,
  resolvePatternOrder,
} from "./params";

describe("parseDifficulty", () => {
  it("acepta 1–5 y rechaza el resto", () => {
    expect(parseDifficulty("1")).toBe(1);
    expect(parseDifficulty("5")).toBe(5);
    expect(parseDifficulty("0")).toBe(null);
    expect(parseDifficulty("6")).toBe(null);
    expect(parseDifficulty("2.5")).toBe(null);
    expect(parseDifficulty("")).toBe(null);
    expect(parseDifficulty("facil")).toBe(null);
  });
});

describe("resolvePatternOrder", () => {
  it("usa el orden pedido cuando es válido", () => {
    expect(resolvePatternOrder("populares", false)).toBe("populares");
    expect(resolvePatternOrder("recientes", true)).toBe("recientes");
    expect(resolvePatternOrder("relevancia", true)).toBe("relevancia");
  });

  it("cae en relevancia con búsqueda y recientes sin ella", () => {
    expect(resolvePatternOrder("", true)).toBe("relevancia");
    expect(resolvePatternOrder("", false)).toBe("recientes");
    // "Relevancia" sin búsqueda no tiene puntaje: vuelve a recientes.
    expect(resolvePatternOrder("relevancia", false)).toBe("recientes");
    expect(resolvePatternOrder("cualquiera", true)).toBe("relevancia");
  });

  it("isPatternOrder solo acepta el vocabulario real", () => {
    expect(isPatternOrder("populares")).toBe(true);
    expect(isPatternOrder("nuevos")).toBe(false);
  });
});

describe("parseYardageBucket", () => {
  it("solo acepta los tres tramos", () => {
    expect(parseYardageBucket("hasta-400")).toBe("hasta-400");
    expect(parseYardageBucket("400-800")).toBe("400-800");
    expect(parseYardageBucket("mas-800")).toBe("mas-800");
    expect(parseYardageBucket("1000")).toBe(null);
    expect(parseYardageBucket("")).toBe(null);
  });
});

describe("parseLanguage", () => {
  it("solo acepta los idiomas del vocabulario", () => {
    expect(parseLanguage("es")).toBe("es");
    expect(parseLanguage("en")).toBe("en");
    expect(parseLanguage("fr")).toBe(null);
    expect(parseLanguage("")).toBe(null);
  });
});
