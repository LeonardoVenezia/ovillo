import { describe, expect, it } from "vitest";

import {
  canModerate,
  groupFormSchema,
  groupSlug,
  isGroupOwner,
  sortGroupMembers,
} from "./schemas";

/**
 * Reglas chicas de la comunidad: slug, permisos, orden de integrantes y
 * validación del formulario. `pnpm vitest run features/community/schemas.test.ts`.
 */

describe("groupSlug", () => {
  it("arma el slug en minúsculas y sin acentos", () => {
    expect(groupSlug("Tejedoras de Rosario")).toBe("tejedoras-de-rosario");
    expect(groupSlug("Amigurumis ¡a full!")).toBe("amigurumis-a-full");
  });

  it("cae en «grupo» cuando el nombre no deja nada utilizable", () => {
    expect(groupSlug("💛🧶")).toBe("grupo");
  });
});

describe("canModerate", () => {
  it("deja pasar a dueña/o y moderadores", () => {
    expect(canModerate("dueno")).toBe(true);
    expect(canModerate("moderador")).toBe(true);
  });

  it("frena a integrantes y a quien no es parte", () => {
    expect(canModerate("miembro")).toBe(false);
    expect(canModerate(null)).toBe(false);
    expect(canModerate(undefined)).toBe(false);
  });
});

describe("isGroupOwner", () => {
  it("solo es cierto para quien creó el grupo", () => {
    expect(isGroupOwner("dueno")).toBe(true);
    expect(isGroupOwner("moderador")).toBe(false);
    expect(isGroupOwner(null)).toBe(false);
  });
});

describe("sortGroupMembers", () => {
  it("ordena dueña/o, moderadores y después por antigüedad", () => {
    const member = (
      name: string,
      role: "dueno" | "moderador" | "miembro",
      createdAt: string,
    ) => ({ name, role, createdAt: new Date(createdAt) });

    const sorted = sortGroupMembers([
      member("nueva", "miembro", "2026-03-01"),
      member("vieja", "miembro", "2026-01-01"),
      member("mod2", "moderador", "2026-02-01"),
      member("mod1", "moderador", "2026-01-15"),
      member("creadora", "dueno", "2026-01-10"),
    ]);

    expect(sorted.map((row) => row.name)).toEqual([
      "creadora",
      "mod1",
      "mod2",
      "vieja",
      "nueva",
    ]);
  });

  it("no muta la lista original", () => {
    const original = [
      { role: "miembro" as const, createdAt: new Date("2026-01-01") },
      { role: "dueno" as const, createdAt: new Date("2026-02-01") },
    ];
    sortGroupMembers(original);
    expect(original[0]?.role).toBe("miembro");
  });
});

describe("groupFormSchema", () => {
  const valid = {
    name: "Crochet en ronda",
    description: "Para compartir patrones y dudas.",
    rules: "Trato amable.",
    category: "tecnica",
    joinPolicy: "abierto",
  };

  it("acepta un grupo completo", () => {
    const parsed = groupFormSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("recorta espacios y exige el nombre", () => {
    const parsed = groupFormSchema.safeParse({ ...valid, name: "  hola  " });
    expect(parsed.success && parsed.data.name).toBe("hola");

    const empty = groupFormSchema.safeParse({ ...valid, name: "   " });
    expect(empty.success).toBe(false);
  });

  it("frena nombre, descripción y reglas demasiado largos", () => {
    expect(
      groupFormSchema.safeParse({ ...valid, name: "a".repeat(61) }).success,
    ).toBe(false);
    expect(
      groupFormSchema.safeParse({
        ...valid,
        description: "a".repeat(501),
      }).success,
    ).toBe(false);
    expect(
      groupFormSchema.safeParse({ ...valid, rules: "a".repeat(1001) }).success,
    ).toBe(false);
  });

  it("rechaza categoría y política desconocidas", () => {
    expect(
      groupFormSchema.safeParse({ ...valid, category: "otra" }).success,
    ).toBe(false);
    expect(
      groupFormSchema.safeParse({ ...valid, joinPolicy: "invitacion" }).success,
    ).toBe(false);
  });
});
