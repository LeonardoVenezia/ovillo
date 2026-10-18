import { es } from "@/messages/es";

import { compressPhoto, PhotoError } from "./compress-image";
import type { PhotoView } from "./media-view";

/**
 * Sube una foto desde el navegador: comprime, manda la grande y la miniatura
 * al Route Handler `/api/fotos` y devuelve la foto guardada.
 */

export type UploadResult =
  { ok: true; photo: PhotoView } | { ok: false; error: string };

export async function uploadPhoto(input: {
  projectId: string;
  purpose: "galeria" | "entrada";
  file: File;
}): Promise<UploadResult> {
  let compressed;
  try {
    compressed = await compressPhoto(input.file);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof PhotoError && error.code === "heavy"
          ? es.projects.photos.errors.tooHeavy
          : es.projects.photos.errors.read,
    };
  }

  const form = new FormData();
  form.set("projectId", input.projectId);
  form.set("purpose", input.purpose);
  form.set("width", String(compressed.width));
  form.set("height", String(compressed.height));
  form.set("file", compressed.full, "foto.jpg");
  form.set("thumb", compressed.thumb, "foto-thumb.jpg");

  try {
    const response = await fetch("/api/fotos", { method: "POST", body: form });
    const payload = (await response
      .json()
      .catch(() => null)) as UploadResult | null;
    if (!payload || typeof payload.ok !== "boolean") {
      return { ok: false, error: es.projects.photos.errors.generic };
    }
    return payload;
  } catch {
    return { ok: false, error: es.projects.photos.errors.generic };
  }
}
