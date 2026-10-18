"use client";

/* eslint-disable @next/next/no-img-element -- las fotos ya llegan comprimidas
   desde el navegador; next/image no aportaría y sumaría cuota. */

import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { es } from "@/messages/es";

import {
  deleteProjectPhoto,
  moveProjectPhoto,
  setProjectCover,
  type MediaActionResult,
} from "../media-actions";
import { MEDIA_LIMITS } from "../media-schemas";
import type { PhotoView } from "../media-view";
import { uploadPhoto } from "../upload-photo";
import { PhotoLightbox } from "./photo-lightbox";

/**
 * Galería del proyecto (spec §5.3) para su dueña: sube fotos (en cola, una
 * por una), elige portada, reordena y borra. Las acciones viven dentro del
 * visor para tener botones grandes y cómodos en el celular.
 */
export function ProjectGallery({
  projectId,
  photos,
  coverImageId,
}: {
  projectId: string;
  photos: PhotoView[];
  coverImageId: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const full = photos.length >= MEDIA_LIMITS.galleryMax;
  const current = viewer !== null ? photos[viewer] : undefined;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || busy) {
      return;
    }
    const list = Array.from(files);
    setBusy(true);
    let uploaded = 0;

    for (let i = 0; i < list.length; i += 1) {
      setStatus(`${es.projects.photos.uploading} (${i + 1}/${list.length})`);
      const result = await uploadPhoto({
        projectId,
        purpose: "galeria",
        file: list[i],
      });
      if (!result.ok) {
        toast.error(result.error);
        break;
      }
      uploaded += 1;
    }

    setStatus(null);
    setBusy(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (uploaded > 0) {
      toast.success(es.projects.photos.added);
      router.refresh();
    }
  }

  function run(
    action: () => Promise<MediaActionResult>,
    success: string,
    after?: () => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      setConfirming(false);
      after?.();
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3" data-testid="project-gallery">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">
          {es.projects.photos.title}
        </h2>
        <span className="text-muted-foreground text-sm">
          {photos.length} / {MEDIA_LIMITS.galleryMax}
        </span>
      </div>

      {photos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {es.projects.photos.emptyBody}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo, index) =>
            photo.thumbUrl ? (
              <button
                key={photo.id}
                type="button"
                aria-label={es.projects.photos.viewPhoto}
                onClick={() => setViewer(index)}
                className="group border-border relative aspect-[4/5] overflow-hidden rounded-xl border"
              >
                <img
                  src={photo.thumbUrl}
                  alt={photo.alt}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
                {photo.imageId === coverImageId ? (
                  <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                    ★ {es.projects.photos.cover}
                  </span>
                ) : null}
              </button>
            ) : null,
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label={es.projects.photos.addInput}
          onChange={(event) => handleFiles(event.target.files)}
        />
        <Button
          type="button"
          size="lg"
          disabled={busy || full}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden="true" />
          {es.projects.photos.add}
        </Button>
        {status ? (
          <span role="status" className="text-muted-foreground text-sm">
            {status}
          </span>
        ) : null}
        {full ? (
          <span className="text-muted-foreground text-sm">
            {es.projects.photos.limitReached}
          </span>
        ) : null}
      </div>

      <p className="text-muted-foreground text-xs">{es.projects.photos.hint}</p>

      {viewer !== null && current ? (
        <PhotoLightbox
          photos={photos}
          index={viewer}
          onClose={() => {
            setViewer(null);
            setConfirming(false);
          }}
          onNavigate={(index) => {
            setViewer(index);
            setConfirming(false);
          }}
          actions={
            <>
              {current.imageId === coverImageId ? (
                <span className="flex items-center gap-1.5 px-2 text-sm font-medium">
                  <Star className="size-4 fill-current" aria-hidden="true" />
                  {es.projects.photos.cover}
                </span>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () => setProjectCover(current.id),
                      es.projects.photos.coverSet,
                    )
                  }
                >
                  <Star aria-hidden="true" />
                  {es.projects.photos.setCover}
                </Button>
              )}

              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={isPending || viewer === 0}
                onClick={() =>
                  run(
                    () => moveProjectPhoto(current.id, -1),
                    es.projects.photos.moved,
                    () => setViewer((value) => Math.max(0, (value ?? 0) - 1)),
                  )
                }
              >
                <ChevronLeft aria-hidden="true" />
                {es.projects.photos.moveEarlier}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={isPending || viewer === photos.length - 1}
                onClick={() =>
                  run(
                    () => moveProjectPhoto(current.id, 1),
                    es.projects.photos.moved,
                    () =>
                      setViewer((value) =>
                        Math.min(photos.length - 1, (value ?? 0) + 1),
                      ),
                  )
                }
              >
                {es.projects.photos.moveLater}
                <ChevronRight aria-hidden="true" />
              </Button>

              {confirming ? (
                <>
                  <span className="px-2 text-sm">
                    {es.projects.photos.removeConfirm}
                  </span>
                  <Button
                    type="button"
                    size="lg"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() =>
                      run(
                        () => deleteProjectPhoto(current.id),
                        es.projects.photos.removed,
                        () => {
                          setViewer(null);
                          setConfirming(false);
                        },
                      )
                    }
                  >
                    {es.projects.photos.removeYes}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => setConfirming(false)}
                  >
                    {es.projects.photos.removeNo}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  variant="destructive"
                  onClick={() => setConfirming(true)}
                >
                  <Trash2 aria-hidden="true" />
                  {es.projects.photos.remove}
                </Button>
              )}
            </>
          }
        />
      ) : null}
    </section>
  );
}
