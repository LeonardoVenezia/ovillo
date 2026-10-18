import { describe, expect, it } from "vitest";

import {
  clampCounterCount,
  COUNTER_COUNT_MAX,
  counterCreateSchema,
  counterSaveSchema,
  COUNTER_NAME_MAX,
  isReminderDue,
  resolveSyncState,
} from "./schemas";

describe("clampCounterCount", () => {
  it("deja intacto un valor razonable", () => {
    expect(clampCounterCount(42)).toBe(42);
  });

  it("no baja de 0 ni pasa el tope", () => {
    expect(clampCounterCount(-3)).toBe(0);
    expect(clampCounterCount(COUNTER_COUNT_MAX + 10)).toBe(COUNTER_COUNT_MAX);
  });

  it("redondea decimales y aguanta valores raros", () => {
    expect(clampCounterCount(7.9)).toBe(7);
    expect(clampCounterCount(Number.NaN)).toBe(0);
    expect(clampCounterCount(Number.POSITIVE_INFINITY)).toBe(COUNTER_COUNT_MAX);
  });
});

describe("isReminderDue", () => {
  it("suena en los múltiplos exactos, nunca en 0", () => {
    expect(isReminderDue(6, 6)).toBe(true);
    expect(isReminderDue(12, 6)).toBe(true);
    expect(isReminderDue(7, 6)).toBe(false);
    expect(isReminderDue(0, 6)).toBe(false);
  });

  it("sin recordatorio nunca suena", () => {
    expect(isReminderDue(24, null)).toBe(false);
  });
});

describe("resolveSyncState", () => {
  it("sin cambios pendientes, manda el servidor", () => {
    expect(
      resolveSyncState(
        { count: 10, version: 3, dirty: false },
        { count: 12, version: 4 },
      ),
    ).toEqual({ count: 12, version: 4, dirty: false, conflict: false });
  });

  it("sin cambios pendientes, el registro local más nuevo que la página manda", () => {
    expect(
      resolveSyncState(
        { count: 0, version: 3, dirty: false },
        { count: 2, version: 2 },
      ),
    ).toEqual({ count: 0, version: 3, dirty: false, conflict: false });
  });

  it("con cambios pendientes sobre la misma versión, manda el teléfono y siguen pendientes", () => {
    expect(
      resolveSyncState(
        { count: 18, version: 3, dirty: true },
        { count: 12, version: 3 },
      ),
    ).toEqual({ count: 18, version: 3, dirty: true, conflict: false });
  });

  it("si otra sesión avanzó, gana el servidor y se avisa el conflicto", () => {
    expect(
      resolveSyncState(
        { count: 18, version: 3, dirty: true },
        { count: 25, version: 4 },
      ),
    ).toEqual({ count: 25, version: 4, dirty: false, conflict: true });
  });

  it("versión nueva pero mismo valor no es conflicto (llegó nuestro guardado)", () => {
    expect(
      resolveSyncState(
        { count: 18, version: 3, dirty: true },
        { count: 18, version: 4 },
      ),
    ).toEqual({ count: 18, version: 4, dirty: false, conflict: false });
  });
});

describe("esquemas del contador", () => {
  it("acepta un contador completo", () => {
    const parsed = counterCreateSchema.safeParse({
      projectId: "p1",
      name: "Cuerpo",
      repeatEvery: 6,
    });
    expect(parsed.success).toBe(true);
  });

  it("recorta el nombre y exige que exista", () => {
    expect(
      counterCreateSchema.safeParse({
        projectId: "p1",
        name: "  ",
        repeatEvery: null,
      }).success,
    ).toBe(false);
    const parsed = counterCreateSchema.safeParse({
      projectId: "p1",
      name: "  Manga izq.  ",
      repeatEvery: null,
    });
    expect(parsed.success && parsed.data.name).toBe("Manga izq.");
  });

  it("limita el largo del nombre", () => {
    const parsed = counterCreateSchema.safeParse({
      projectId: "p1",
      name: "x".repeat(COUNTER_NAME_MAX + 1),
      repeatEvery: null,
    });
    expect(parsed.success).toBe(false);
  });

  it("el recordatorio va de 2 a 999 (o sin recordatorio)", () => {
    const base = { projectId: "p1", name: "Cuerpo" };
    expect(
      counterCreateSchema.safeParse({ ...base, repeatEvery: 1 }).success,
    ).toBe(false);
    expect(
      counterCreateSchema.safeParse({ ...base, repeatEvery: 1000 }).success,
    ).toBe(false);
    expect(
      counterCreateSchema.safeParse({ ...base, repeatEvery: 2 }).success,
    ).toBe(true);
  });

  it("el guardado exige versión y un conteo válido", () => {
    expect(
      counterSaveSchema.safeParse({ id: "c1", count: 5, baseVersion: 1 })
        .success,
    ).toBe(true);
    expect(
      counterSaveSchema.safeParse({ id: "c1", count: -1, baseVersion: 1 })
        .success,
    ).toBe(false);
    expect(
      counterSaveSchema.safeParse({ id: "c1", count: 5, baseVersion: 0 })
        .success,
    ).toBe(false);
  });
});
