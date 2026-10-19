import { describe, expect, it } from "vitest";

import { repliesLabel, whenLabel } from "./format";
import {
  canCreateThreadType,
  canMarkSolution,
  canModerate,
  groupFormSchema,
  groupSlug,
  isGroupOwner,
  postFormSchema,
  sortGroupMembers,
  threadFormSchema,
} from "./schemas";

/**
 * Reglas chicas de la comunidad: slug, permisos, orden de integrantes,
 * validación de los formularios de grupo y de hilo, y etiquetas de tiempo.
 * `pnpm vitest run features/community/schemas.test.ts`.
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

describe("canCreateThreadType", () => {
  it("reserva los anuncios para la moderación", () => {
    expect(canCreateThreadType("miembro", "charla")).toBe(true);
    expect(canCreateThreadType("miembro", "pregunta")).toBe(true);
    expect(canCreateThreadType(null, "muestro")).toBe(true);
    expect(canCreateThreadType("miembro", "anuncio")).toBe(false);
    expect(canCreateThreadType(null, "anuncio")).toBe(false);
    expect(canCreateThreadType("moderador", "anuncio")).toBe(true);
    expect(canCreateThreadType("dueno", "anuncio")).toBe(true);
  });
});

describe("canMarkSolution", () => {
  it("deja marcar a quien abrió la pregunta y a la moderación", () => {
    expect(canMarkSolution({ viewerRole: null, isAuthor: true })).toBe(true);
    expect(canMarkSolution({ viewerRole: "moderador", isAuthor: false })).toBe(
      true,
    );
    expect(canMarkSolution({ viewerRole: "dueno", isAuthor: false })).toBe(
      true,
    );
  });

  it("frena al resto de la comunidad", () => {
    expect(canMarkSolution({ viewerRole: "miembro", isAuthor: false })).toBe(
      false,
    );
    expect(canMarkSolution({ viewerRole: null, isAuthor: false })).toBe(false);
  });
});

describe("threadFormSchema", () => {
  const valid = {
    groupId: "g1",
    type: "pregunta",
    title: "¿Cómo cierro el cuello?",
    body: "Probé con aguja 4 y no me queda prolijo.",
    imageIds: [],
  };

  it("acepta un hilo completo y recorta el texto", () => {
    const parsed = threadFormSchema.safeParse({ ...valid, title: "  hola  " });
    expect(parsed.success && parsed.data.title).toBe("hola");
  });

  it("exige título y algo que publicar", () => {
    expect(threadFormSchema.safeParse({ ...valid, title: "   " }).success).toBe(
      false,
    );
    expect(threadFormSchema.safeParse({ ...valid, body: "" }).success).toBe(
      false,
    );
    // Una foto alcanza como contenido; el proyecto adjunto no.
    expect(
      threadFormSchema.safeParse({ ...valid, body: "", imageIds: ["i1"] })
        .success,
    ).toBe(true);
    expect(
      threadFormSchema.safeParse({ ...valid, body: "", projectId: "p1" })
        .success,
    ).toBe(false);
  });

  it("frena tipo, título, texto y fotos fuera de rango", () => {
    expect(threadFormSchema.safeParse({ ...valid, type: "otro" }).success).toBe(
      false,
    );
    expect(
      threadFormSchema.safeParse({ ...valid, title: "a".repeat(121) }).success,
    ).toBe(false);
    expect(
      threadFormSchema.safeParse({ ...valid, body: "a".repeat(4001) }).success,
    ).toBe(false);
    expect(
      threadFormSchema.safeParse({
        ...valid,
        imageIds: ["1", "2", "3", "4", "5"],
      }).success,
    ).toBe(false);
  });
});

describe("postFormSchema", () => {
  const valid = {
    threadId: "h1",
    body: "Probá cerrar en el revés.",
    imageIds: [],
  };

  it("acepta una respuesta con texto o con foto", () => {
    expect(postFormSchema.safeParse(valid).success).toBe(true);
    expect(
      postFormSchema.safeParse({ ...valid, body: "", imageIds: ["i1"] })
        .success,
    ).toBe(true);
  });

  it("no deja respuestas vacías y frena textos larguísimos", () => {
    expect(postFormSchema.safeParse({ ...valid, body: "   " }).success).toBe(
      false,
    );
    expect(
      postFormSchema.safeParse({ ...valid, body: "a".repeat(4001) }).success,
    ).toBe(false);
  });
});

describe("whenLabel", () => {
  const now = new Date("2026-10-19T12:00:00Z");

  it("resume los últimos movimientos", () => {
    expect(whenLabel(new Date("2026-10-19T11:59:30Z"), now)).toBe("recién");
    expect(whenLabel(new Date("2026-10-19T11:30:00Z"), now)).toBe(
      "hace 30 min",
    );
    expect(whenLabel(new Date("2026-10-19T09:00:00Z"), now)).toBe("hace 3 h");
    expect(whenLabel(new Date("2026-10-18T09:00:00Z"), now)).toBe("ayer");
    expect(whenLabel(new Date("2026-10-15T09:00:00Z"), now)).toBe(
      "hace 4 días",
    );
    expect(whenLabel(new Date("2026-09-01T09:00:00Z"), now)).toContain("2026");
  });
});

describe("repliesLabel", () => {
  it("cambia con la cantidad de respuestas", () => {
    expect(repliesLabel(0)).toBe("Todavía sin respuestas");
    expect(repliesLabel(1)).toBe("1 respuesta");
    expect(repliesLabel(4)).toBe("4 respuestas");
  });
});
