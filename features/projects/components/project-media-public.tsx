"use client";

/* eslint-disable @next/next/no-img-element -- las fotos ya llegan comprimidas
   desde el navegador; next/image no aportaría y sumaría cuota. */

import { useState } from "react";

import { es } from "@/messages/es";

import { formatProjectDate } from "../format";
import type { DiaryEntryView, PhotoView } from "../media-view";
import { PhotoLightbox } from "./photo-lightbox";

/**
 * Galería y diario como los ve la comunidad (spec §5.3): solo lectura, con
 * el visor a pantalla completa. Si no hay fotos ni entradas, no ocupa lugar.
 */
export function ProjectMediaPublic({
  photos,
  entries,
}: {
  photos: PhotoView[];
  entries: DiaryEntryView[];
}) {
  const [viewer, setViewer] = useState<{
    photos: PhotoView[];
    index: number;
  } | null>(null);

  const visiblePhotos = photos.filter((photo) => photo.thumbUrl !== null);
  const entriesWithContent = entries.filter(
    (entry) =>
      entry.body.trim().length > 0 ||
      entry.photos.some((photo) => photo.thumbUrl !== null),
  );

  if (visiblePhotos.length === 0 && entriesWithContent.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8" data-testid="project-media-public">
      {visiblePhotos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">
            {es.projects.photos.title}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visiblePhotos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                aria-label={es.projects.photos.viewPhoto}
                onClick={() => setViewer({ photos: visiblePhotos, index })}
                className="border-border group relative aspect-[4/5] overflow-hidden rounded-xl border"
              >
                <img
                  src={photo.thumbUrl ?? ""}
                  alt={photo.alt}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {entriesWithContent.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">
            {es.projects.diary.title}
          </h2>
          {entriesWithContent.map((entry) => (
            <article
              key={entry.id}
              className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4"
            >
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {formatProjectDate(entry.entryDate)}
              </p>
              {entry.body ? (
                <p className="text-sm break-words whitespace-pre-wrap">
                  {entry.body}
                </p>
              ) : null}
              {entry.photos.some((photo) => photo.thumbUrl) ? (
                <div className="flex flex-wrap gap-2">
                  {entry.photos.map((photo, index) =>
                    photo.thumbUrl ? (
                      <button
                        key={photo.id}
                        type="button"
                        aria-label={es.projects.photos.viewPhoto}
                        onClick={() =>
                          setViewer({ photos: entry.photos, index })
                        }
                        className="border-border overflow-hidden rounded-lg border"
                      >
                        <img
                          src={photo.thumbUrl}
                          alt={photo.alt}
                          loading="lazy"
                          className="h-20 w-16 object-cover"
                        />
                      </button>
                    ) : null,
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {viewer ? (
        <PhotoLightbox
          photos={viewer.photos}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onNavigate={(index) => setViewer({ photos: viewer.photos, index })}
        />
      ) : null}
    </div>
  );
}
