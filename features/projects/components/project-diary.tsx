"use client";

/* eslint-disable @next/next/no-img-element -- las fotos ya llegan comprimidas
   desde el navegador; next/image no aportaría y sumaría cuota. */

import { ImagePlus, NotebookPen, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { es } from "@/messages/es";

import { formatProjectDate } from "../format";
import { deleteProjectEntry, saveProjectEntry } from "../media-actions";
import { MEDIA_LIMITS } from "../media-schemas";
import type { DiaryEntryView, PhotoView } from "../media-view";
import { uploadPhoto } from "../upload-photo";
import { PhotoLightbox } from "./photo-lightbox";

/** Fecha de hoy en la zona del dispositivo, como `YYYY-MM-DD`. */
function todayLocalIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

type PendingPhoto = { file: File; url: string };

/**
 * Diario de avance (spec §5.3): entradas con fecha, texto corto y hasta 4
 * fotos. Al guardar, las fotos se comprimen y suben de a una y después se
 * crea la entrada con sus ids.
 */
export function ProjectDiary({
  projectId,
  entries,
}: {
  projectId: string;
  entries: DiaryEntryView[];
}) {
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [entryDate, setEntryDate] = useState(todayLocalIso);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{
    photos: PhotoView[];
    index: number;
  } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

  // Libera las vistas previas que hayan quedado colgadas.
  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    const room = MEDIA_LIMITS.entryPhotosMax - pending.length;
    const list = Array.from(files);
    if (list.length > room) {
      toast.error(es.projects.diary.photosMax);
    }
    const next = list.slice(0, Math.max(0, room)).map((file) => {
      const url = URL.createObjectURL(file);
      urlsRef.current.push(url);
      return { file, url };
    });
    setPending((value) => [...value, ...next]);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  function removePending(index: number) {
    setPending((value) => {
      const photo = value[index];
      if (photo) {
        URL.revokeObjectURL(photo.url);
        urlsRef.current = urlsRef.current.filter((url) => url !== photo.url);
      }
      return value.filter((_, position) => position !== index);
    });
  }

  function resetForm() {
    pending.forEach((photo) => URL.revokeObjectURL(photo.url));
    urlsRef.current = [];
    setPending([]);
    setBody("");
    setEntryDate(todayLocalIso());
    setComposing(false);
  }

  async function submit() {
    const text = body.trim();
    if (text.length === 0 && pending.length === 0) {
      toast.error(es.projects.diary.errors.needSomething);
      return;
    }

    setBusy(true);
    try {
      const imageIds: string[] = [];
      for (let i = 0; i < pending.length; i += 1) {
        setStatus(
          `${es.projects.diary.uploading} (${i + 1}/${pending.length})`,
        );
        const result = await uploadPhoto({
          projectId,
          purpose: "entrada",
          file: pending[i].file,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        imageIds.push(result.photo.imageId);
      }

      setStatus(es.projects.diary.saving);
      const result = await saveProjectEntry({
        projectId,
        entryDate,
        body: text,
        imageIds,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(es.projects.diary.saved);
      resetForm();
      router.refresh();
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  function deleteEntry(entryId: string) {
    startTransition(async () => {
      const result = await deleteProjectEntry(entryId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.projects.diary.deleted);
      setConfirmingId(null);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3" data-testid="project-diary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">
          {es.projects.diary.title}
        </h2>
        {!composing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setComposing(true)}
          >
            <NotebookPen aria-hidden="true" />
            {es.projects.diary.newCta}
          </Button>
        ) : null}
      </div>

      {composing ? (
        <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="diary-date">{es.projects.diary.dateLabel}</Label>
            <Input
              id="diary-date"
              type="date"
              value={entryDate}
              max={todayLocalIso()}
              onChange={(event) => setEntryDate(event.target.value)}
              className="w-fit"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="diary-body">{es.projects.diary.bodyLabel}</Label>
            <Textarea
              id="diary-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={es.projects.diary.bodyPlaceholder}
              maxLength={MEDIA_LIMITS.bodyMax}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="flex flex-wrap items-baseline gap-1.5 text-sm font-medium">
              {es.projects.diary.photosLabel}
              <span className="text-muted-foreground text-xs font-normal">
                {es.projects.diary.photosHint}
              </span>
            </span>
            {pending.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pending.map((photo, index) => (
                  <span key={photo.url} className="relative">
                    <img
                      src={photo.url}
                      alt=""
                      className="border-border h-20 w-16 rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      aria-label={es.projects.diary.removePhoto}
                      onClick={() => removePending(index)}
                      className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full bg-black/75 text-white"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-label={es.projects.diary.addPhotos}
              onChange={(event) => addFiles(event.target.files)}
            />
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-fit"
              disabled={busy || pending.length >= MEDIA_LIMITS.entryPhotosMax}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus aria-hidden="true" />
              {es.projects.diary.addPhotos}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="lg" disabled={busy} onClick={submit}>
              {busy ? es.projects.diary.saving : es.projects.diary.save}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              disabled={busy}
              onClick={resetForm}
            >
              {es.projects.diary.cancel}
            </Button>
            {status ? (
              <span role="status" className="text-muted-foreground text-sm">
                {status}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {entries.length === 0 && !composing ? (
        <p className="text-muted-foreground text-sm">
          {es.projects.diary.emptyBody}
        </p>
      ) : null}

      {entries.map((entry) => (
        <article
          key={entry.id}
          className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {formatProjectDate(entry.entryDate)}
            </p>
            {confirmingId === entry.id ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  {es.projects.diary.deleteConfirm}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => deleteEntry(entry.id)}
                >
                  {es.projects.diary.deleteYes}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => setConfirmingId(null)}
                >
                  {es.projects.diary.deleteNo}
                </Button>
              </span>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={es.projects.diary.deleteCta}
                onClick={() => setConfirmingId(entry.id)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </div>

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
                    onClick={() => setViewer({ photos: entry.photos, index })}
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

      {viewer ? (
        <PhotoLightbox
          photos={viewer.photos}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onNavigate={(index) => setViewer({ photos: viewer.photos, index })}
        />
      ) : null}
    </section>
  );
}
