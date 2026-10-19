import type { PhotoView } from "@/features/projects/media-view";

/**
 * Fotos de un hilo o una respuesta: grilla cuadrada con las miniaturas
 * públicas de R2. Sin `R2_PUBLIC_URL` no se muestra nada (degradación con
 * gracia, igual que el resto de las fotos).
 */
export function ThreadPhotos({ photos }: { photos: PhotoView[] }) {
  const visible = photos.filter((photo) => photo.thumbUrl !== null);
  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      data-testid="thread-photos"
    >
      {visible.map((photo) => (
        <span
          key={photo.imageId}
          className="border-border overflow-hidden rounded-xl border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- miniatura pública de R2 */}
          <img
            src={photo.thumbUrl!}
            alt={photo.alt}
            className="aspect-square w-full object-cover"
          />
        </span>
      ))}
    </div>
  );
}
