"use client";

/* eslint-disable @next/next/no-img-element -- las fotos ya llegan comprimidas
   desde el navegador; next/image no aportaría y sumaría cuota. */

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { es } from "@/messages/es";

import type { PhotoView } from "../media-view";

/**
 * Visor de fotos a pantalla completa, sin dependencias: Escape cierra y las
 * flechas del teclado navegan. `actions` es el hueco para las acciones de la
 * dueña (portada, orden, borrar) cuando la galería está en modo gestión.
 */
export function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
  actions,
}: {
  photos: PhotoView[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  actions?: ReactNode;
}) {
  const photo = photos[index];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && index > 0) {
        onNavigate(index - 1);
      } else if (event.key === "ArrowRight" && index < photos.length - 1) {
        onNavigate(index + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo?.fullUrl) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt || es.projects.photos.viewerLabel}
      data-testid="photo-viewer"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/85 p-4"
      onClick={onClose}
    >
      <img
        src={photo.fullUrl}
        alt={photo.alt}
        className="max-h-[70vh] max-w-full rounded-xl object-contain"
        onClick={(event) => event.stopPropagation()}
      />

      {actions ? (
        <div
          className="flex max-w-2xl flex-wrap items-center justify-center gap-2 rounded-2xl bg-white/95 p-2 text-zinc-900 dark:bg-zinc-900/95 dark:text-zinc-50"
          onClick={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}

      <button
        type="button"
        aria-label={es.projects.photos.close}
        onClick={onClose}
        className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
      >
        <X className="size-5" aria-hidden="true" />
      </button>

      {index > 0 ? (
        <button
          type="button"
          aria-label={es.projects.photos.previous}
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(index - 1);
          }}
          className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
      ) : null}

      {index < photos.length - 1 ? (
        <button
          type="button"
          aria-label={es.projects.photos.next}
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(index + 1);
          }}
          className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
