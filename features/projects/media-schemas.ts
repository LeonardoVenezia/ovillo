import { z } from "zod";

/**
 * Límites de fotos y diario (spec §5.3) y de la foto del inventario (D-046).
 *
 * El cliente comprime antes de subir (≤ 1600 px y calidad ajustada); estos
 * topes son la red de seguridad del servidor y la que protege los 10 GB
 * gratuitos de R2: con ~300 KB por foto (grande + miniatura), 10 GB alcanzan
 * para decenas de miles de imágenes.
 */

export const MEDIA_LIMITS = {
  /** Galería de un proyecto (spec §5.3). */
  galleryMax: 20,
  /** Fotos por entrada del diario. */
  entryPhotosMax: 4,
  /** Texto corto de una entrada. */
  bodyMax: 500,
  /** Tope duro del archivo grande que acepta el servidor. */
  fullMaxBytes: 1_500_000,
  /** Tope duro de la miniatura. */
  thumbMaxBytes: 400_000,
  /** Lado máximo aceptado (el cliente apunta a 1600). */
  maxEdge: 4096,
} as const;

export const UPLOAD_PURPOSES = ["galeria", "entrada", "lana"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

export function isUploadPurpose(value: string): value is UploadPurpose {
  return (UPLOAD_PURPOSES as readonly string[]).includes(value);
}

export type UploadError = "type" | "weight" | "size" | "limit";

export type UploadCheck = { ok: true } | { ok: false; error: UploadError };

/** Chequeo puro y testeable de una subida (lo usa el Route Handler). */
export function checkImageUpload(input: {
  purpose: UploadPurpose;
  mime: string;
  fullBytes: number;
  thumbBytes: number;
  width: number;
  height: number;
  /** Fotos que ya tiene la galería (solo importa para `galeria`). */
  galleryCount?: number;
}): UploadCheck {
  if (input.mime !== "image/jpeg") {
    return { ok: false, error: "type" };
  }

  if (
    input.fullBytes > MEDIA_LIMITS.fullMaxBytes ||
    input.thumbBytes > MEDIA_LIMITS.thumbMaxBytes
  ) {
    return { ok: false, error: "weight" };
  }

  const dimsOk =
    Number.isInteger(input.width) &&
    Number.isInteger(input.height) &&
    input.width >= 1 &&
    input.height >= 1 &&
    input.width <= MEDIA_LIMITS.maxEdge &&
    input.height <= MEDIA_LIMITS.maxEdge;
  if (!dimsOk) {
    return { ok: false, error: "size" };
  }

  if (
    input.purpose === "galeria" &&
    (input.galleryCount ?? 0) >= MEDIA_LIMITS.galleryMax
  ) {
    return { ok: false, error: "limit" };
  }

  return { ok: true };
}

/**
 * Fecha razonable para una entrada: formato `YYYY-MM-DD`, desde el año 2000 y
 * sin irse más allá de mañana (el "hoy" se mide en UTC; el margen de un día
 * cubre los husos horarios).
 */
export function isReasonableEntryDate(
  value: string,
  now: Date = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time)) {
    return false;
  }
  // JS "corrige" fechas inexistentes (31 de febrero → 3 de marzo): el ida y
  // vuelta descarta esas.
  if (new Date(time).toISOString().slice(0, 10) !== value) {
    return false;
  }
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return value >= "2000-01-01" && value <= tomorrow;
}

export const entryInputSchema = z
  .object({
    projectId: z.string().min(1),
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    body: z.string().trim().max(MEDIA_LIMITS.bodyMax),
    imageIds: z.array(z.string().min(1)).max(MEDIA_LIMITS.entryPhotosMax),
  })
  .refine((data) => data.body.length > 0 || data.imageIds.length > 0, {
    path: ["body"],
  });

export type EntryInput = z.infer<typeof entryInputSchema>;
