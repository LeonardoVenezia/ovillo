import { getPublicUrl } from "@/storage";

import type {
  ImageRow,
  ProjectEntryWithImages,
  ProjectPhotoWithImage,
} from "./media-queries";

/**
 * Vistas de fotos listas para la UI: la clave de R2 ya convertida en URLs
 * públicas. Si `R2_PUBLIC_URL` todavía no está configurada, las URLs quedan
 * en `null` y los componentes simplemente no muestran imágenes (degradación
 * con gracia, sin romper la página).
 *
 * Estos tipos los importan también componentes de cliente: solo como tipo
 * (el módulo en sí es de servidor).
 */

export type PhotoView = {
  /** Id de la foto de galería (`project_photo`) o de la imagen en el diario. */
  id: string;
  imageId: string;
  width: number;
  height: number;
  alt: string;
  fullUrl: string | null;
  thumbUrl: string | null;
};

export type DiaryEntryView = {
  id: string;
  entryDate: string;
  body: string;
  photos: PhotoView[];
};

/** La miniatura es la misma clave con `-thumb` antes de `jpg`. */
export function thumbKeyFor(r2Key: string): string {
  return r2Key.replace(/\.jpg$/, "-thumb.jpg");
}

/**
 * URL pública de la miniatura de una imagen, o `null` si `R2_PUBLIC_URL`
 * todavía no está configurada (las tarjetas simplemente no muestran foto).
 */
export function thumbUrlFor(r2Key: string): string | null {
  const publicUrl = getPublicUrl();
  return publicUrl ? `${publicUrl}/${thumbKeyFor(r2Key)}` : null;
}

function urlsFor(r2Key: string): Pick<PhotoView, "fullUrl" | "thumbUrl"> {
  const publicUrl = getPublicUrl();
  if (!publicUrl) {
    return { fullUrl: null, thumbUrl: null };
  }
  return {
    fullUrl: `${publicUrl}/${r2Key}`,
    thumbUrl: `${publicUrl}/${thumbKeyFor(r2Key)}`,
  };
}

export function toPhotoView(row: ImageRow, id: string = row.id): PhotoView {
  return {
    id,
    imageId: row.id,
    width: row.width,
    height: row.height,
    alt: row.altText ?? "",
    ...urlsFor(row.r2Key),
  };
}

export function toPhotoViews(photos: ProjectPhotoWithImage[]): PhotoView[] {
  return photos.map(({ photoId, image }) => toPhotoView(image, photoId));
}

export function toEntryViews(
  entries: ProjectEntryWithImages[],
): DiaryEntryView[] {
  return entries.map(({ entry, images }) => ({
    id: entry.id,
    entryDate: entry.entryDate,
    body: entry.body,
    photos: images.map((image) => toPhotoView(image)),
  }));
}
