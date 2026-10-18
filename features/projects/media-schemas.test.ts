import { describe, expect, it } from "vitest";

import {
  checkImageUpload,
  entryInputSchema,
  isReasonableEntryDate,
  isUploadPurpose,
  MEDIA_LIMITS,
} from "./media-schemas";

describe("checkImageUpload", () => {
  const base = {
    purpose: "galeria" as const,
    mime: "image/jpeg",
    fullBytes: 300_000,
    thumbBytes: 60_000,
    width: 1600,
    height: 1200,
  };

  it("acepta una foto comprimida normal", () => {
    expect(checkImageUpload(base)).toEqual({ ok: true });
  });

  it("rechaza formatos que no son JPEG", () => {
    expect(checkImageUpload({ ...base, mime: "image/png" })).toEqual({
      ok: false,
      error: "type",
    });
  });

  it("rechaza la foto grande por peso", () => {
    expect(
      checkImageUpload({ ...base, fullBytes: MEDIA_LIMITS.fullMaxBytes + 1 }),
    ).toEqual({ ok: false, error: "weight" });
  });

  it("rechaza la miniatura por peso", () => {
    expect(
      checkImageUpload({ ...base, thumbBytes: MEDIA_LIMITS.thumbMaxBytes + 1 }),
    ).toEqual({ ok: false, error: "weight" });
  });

  it("rechaza medidas raras o fuera de rango", () => {
    expect(checkImageUpload({ ...base, width: 0 })).toEqual({
      ok: false,
      error: "size",
    });
    expect(checkImageUpload({ ...base, height: 10_000 })).toEqual({
      ok: false,
      error: "size",
    });
    expect(checkImageUpload({ ...base, width: 12.5 })).toEqual({
      ok: false,
      error: "size",
    });
  });

  it("llena la galería hasta 20 y después rechaza", () => {
    expect(
      checkImageUpload({
        ...base,
        galleryCount: MEDIA_LIMITS.galleryMax - 1,
      }),
    ).toEqual({ ok: true });
    expect(
      checkImageUpload({ ...base, galleryCount: MEDIA_LIMITS.galleryMax }),
    ).toEqual({ ok: false, error: "limit" });
  });

  it("las fotos de una entrada no cuentan contra la galería", () => {
    expect(
      checkImageUpload({
        ...base,
        purpose: "entrada",
        galleryCount: MEDIA_LIMITS.galleryMax,
      }),
    ).toEqual({ ok: true });
  });
});

describe("isUploadPurpose", () => {
  it("solo acepta los destinos previstos", () => {
    expect(isUploadPurpose("galeria")).toBe(true);
    expect(isUploadPurpose("entrada")).toBe(true);
    expect(isUploadPurpose("avatar")).toBe(false);
    expect(isUploadPurpose("")).toBe(false);
  });
});

describe("isReasonableEntryDate", () => {
  const now = new Date("2026-10-17T15:00:00Z");

  it("acepta hoy, ayer y fechas viejas razonables", () => {
    expect(isReasonableEntryDate("2026-10-17", now)).toBe(true);
    expect(isReasonableEntryDate("2026-10-16", now)).toBe(true);
    expect(isReasonableEntryDate("2021-01-01", now)).toBe(true);
  });

  it("acepta mañana (margen para husos horarios) pero no más", () => {
    expect(isReasonableEntryDate("2026-10-18", now)).toBe(true);
    expect(isReasonableEntryDate("2026-10-19", now)).toBe(false);
  });

  it("rechaza formatos raros y años imposibles", () => {
    expect(isReasonableEntryDate("17/10/2026", now)).toBe(false);
    expect(isReasonableEntryDate("2026-02-31", now)).toBe(false);
    expect(isReasonableEntryDate("1999-12-31", now)).toBe(false);
  });
});

describe("entryInputSchema", () => {
  const base = {
    projectId: "proyecto1",
    entryDate: "2026-10-17",
    body: "Terminé el canesú.",
    imageIds: [],
  };

  it("acepta texto solo o fotos solo", () => {
    expect(entryInputSchema.safeParse(base).success).toBe(true);
    expect(
      entryInputSchema.safeParse({ ...base, body: "", imageIds: ["a"] })
        .success,
    ).toBe(true);
  });

  it("exige texto o al menos una foto", () => {
    expect(
      entryInputSchema.safeParse({ ...base, body: "   ", imageIds: [] })
        .success,
    ).toBe(false);
  });

  it("recorta el texto y limita su largo", () => {
    const parsed = entryInputSchema.safeParse({ ...base, body: "  hola  " });
    expect(parsed.success && parsed.data.body).toBe("hola");
    expect(
      entryInputSchema.safeParse({
        ...base,
        body: "x".repeat(MEDIA_LIMITS.bodyMax + 1),
      }).success,
    ).toBe(false);
  });

  it("limita las fotos por entrada y valida la fecha", () => {
    expect(
      entryInputSchema.safeParse({
        ...base,
        imageIds: Array.from(
          { length: MEDIA_LIMITS.entryPhotosMax + 1 },
          (_, i) => `foto${i}`,
        ),
      }).success,
    ).toBe(false);
    expect(
      entryInputSchema.safeParse({ ...base, entryDate: "17-10-2026" }).success,
    ).toBe(false);
  });
});
