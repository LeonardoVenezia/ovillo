import { describe, expect, it } from "vitest";

import {
  eventCraftLabel,
  eventDatesLabel,
  eventFinishedLabel,
  eventParticipantsLabel,
  eventStageLabel,
  eventStatusLabel,
  repliesLabel,
  whenLabel,
} from "./format";
import {
  canCreateThreadType,
  canMarkSolution,
  canModerate,
  canOrganizeEvent,
  eventFormSchema,
  eventStatus,
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

describe("eventStatus", () => {
  const today = "2026-10-19";

  it("deriva próximo, en curso y terminado de las fechas", () => {
    expect(eventStatus("2026-11-01", "2026-11-20", today)).toBe("proximo");
    expect(eventStatus("2026-10-01", "2026-10-25", today)).toBe("en-curso");
    expect(eventStatus("2026-09-01", "2026-09-30", today)).toBe("terminado");
  });

  it("los bordes cuentan como en curso", () => {
    expect(eventStatus("2026-10-19", "2026-10-19", today)).toBe("en-curso");
    expect(eventStatus("2026-10-19", "2026-11-01", today)).toBe("en-curso");
    expect(eventStatus("2026-09-01", "2026-10-19", today)).toBe("en-curso");
  });
});

describe("canOrganizeEvent", () => {
  it("los KAL/CAL los organiza solo la moderación (D-056)", () => {
    expect(canOrganizeEvent("dueno")).toBe(true);
    expect(canOrganizeEvent("moderador")).toBe(true);
    expect(canOrganizeEvent("miembro")).toBe(false);
    expect(canOrganizeEvent(null)).toBe(false);
  });
});

describe("eventFormSchema", () => {
  const valid = {
    name: "KAL Sweater de otoño",
    craft: "dos-agujas",
    startsAt: "2026-10-10",
    endsAt: "2026-11-10",
    description: "Tejemos juntas una prenda de abrigo.",
    patternIds: ["p1"],
    stages: [{ title: "Montar y elástico", note: "" }],
  };

  it("acepta un KAL/CAL completo y recorta el nombre", () => {
    const parsed = eventFormSchema.safeParse({ ...valid, name: "  KAL  " });
    expect(parsed.success && parsed.data.name).toBe("KAL");
  });

  it("exige nombre, fechas válidas y técnica conocida", () => {
    expect(eventFormSchema.safeParse({ ...valid, name: "   " }).success).toBe(
      false,
    );
    expect(
      eventFormSchema.safeParse({ ...valid, startsAt: "10/10/2026" }).success,
    ).toBe(false);
    expect(eventFormSchema.safeParse({ ...valid, endsAt: "" }).success).toBe(
      false,
    );
    expect(
      eventFormSchema.safeParse({ ...valid, craft: "telar" }).success,
    ).toBe(false);
  });

  it("frena la fecha de fin anterior a la de inicio", () => {
    const parsed = eventFormSchema.safeParse({
      ...valid,
      startsAt: "2026-11-10",
      endsAt: "2026-10-10",
    });
    expect(parsed.success).toBe(false);
  });

  it("limita patrones y etapas", () => {
    expect(
      eventFormSchema.safeParse({
        ...valid,
        patternIds: ["1", "2", "3", "4", "5"],
      }).success,
    ).toBe(false);
    expect(
      eventFormSchema.safeParse({
        ...valid,
        stages: Array.from({ length: 9 }, () => ({ title: "Etapa", note: "" })),
      }).success,
    ).toBe(false);
    expect(
      eventFormSchema.safeParse({
        ...valid,
        stages: [{ title: "   ", note: "" }],
      }).success,
    ).toBe(false);
  });
});

describe("etiquetas de los KAL/CAL", () => {
  it("traduce la técnica a KAL o CAL", () => {
    expect(eventCraftLabel("dos-agujas")).toBe("KAL");
    expect(eventCraftLabel("crochet")).toBe("CAL");
  });

  it("nombra los estados", () => {
    expect(eventStatusLabel("proximo")).toBe("Próximo");
    expect(eventStatusLabel("en-curso")).toBe("En curso");
    expect(eventStatusLabel("terminado")).toBe("Terminado");
  });

  it("numera las etapas y cuenta participantes y finales", () => {
    expect(eventStageLabel(0)).toBe("Etapa 1");
    expect(eventStageLabel(4)).toBe("Etapa 5");
    expect(eventParticipantsLabel(1)).toBe("1 participante");
    expect(eventParticipantsLabel(3)).toBe("3 participantes");
    expect(eventFinishedLabel(1, 2)).toBe("1 de 2 terminaron");
  });

  it("arma el rango de fechas en un mismo mes, entre meses y entre años", () => {
    expect(eventDatesLabel("2026-10-05", "2026-10-25")).toBe(
      "Del 5 al 25 de octubre de 2026",
    );
    expect(eventDatesLabel("2026-09-28", "2026-10-12")).toBe(
      "Del 28 de septiembre al 12 de octubre de 2026",
    );
    expect(eventDatesLabel("2026-12-28", "2027-01-12")).toBe(
      "Del 28 de diciembre de 2026 al 12 de enero de 2027",
    );
  });
});
