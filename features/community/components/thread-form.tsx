"use client";

import { ImagePlus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  THREAD_BODY_MAX,
  THREAD_PHOTOS_MAX,
  THREAD_TITLE_MAX,
  type ThreadType,
} from "@/db/community-schema";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import type { PhotoView } from "@/features/projects/media-view";
import { uploadPhoto } from "@/features/projects/upload-photo";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { threadTypeLabel } from "../format";
import { createThread } from "../thread-actions";

export type ThreadFormGroup = { id: string; slug: string; name: string };

export type ThreadFormProject = {
  id: string;
  name: string;
  cover: PhotoView | null;
  patternName: string | null;
};

/**
 * Formulario de hilo (spec §5.9): el grupo puede venir fijo (ficha del
 * grupo) o elegirse entre los propios (preguntar / "Pedir ayuda"), el tipo
 * se limita según el rol (los anuncios son de moderación) y las fotos suben
 * con el destino `hilo` (D-055) antes de publicar.
 */
export function ThreadForm({
  groups,
  allowedTypes,
  fixedGroup = null,
  project = null,
  defaultTitle = "",
  cancelHref,
}: {
  groups: ThreadFormGroup[];
  allowedTypes: ThreadType[];
  fixedGroup?: ThreadFormGroup | null;
  project?: ThreadFormProject | null;
  defaultTitle?: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(
    () => (fixedGroup ?? groups[0])?.id ?? "",
  );
  const [type, setType] = useState<ThreadType>(
    () => allowedTypes[0] ?? "charla",
  );
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
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
    const room = THREAD_PHOTOS_MAX - pending.length;
    const list = Array.from(files);
    if (list.length > room) {
      toast.error(es.community.threadForm.photosMax);
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

  async function submit() {
    if (groupId === "") {
      toast.error(es.community.threadForm.noGroups);
      return;
    }
    if (title.trim().length === 0) {
      toast.error(es.community.errors.titleRequired);
      return;
    }
    if (body.trim().length === 0 && pending.length === 0) {
      toast.error(es.community.errors.emptyThread);
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
          purpose: "hilo",
          file: pending[i].file,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        imageIds.push(result.photo.imageId);
      }

      setStatus(es.community.threadForm.saving);
      const result = await createThread({
        groupId,
        type,
        title: title.trim(),
        body: body.trim(),
        imageIds,
        projectId: project?.id,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(es.community.threadForm.created);
      const slug =
        (fixedGroup ?? groups.find((group) => group.id === groupId))?.slug ??
        "";
      router.push(`/grupos/${slug}/hilos/${result.id}`);
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  if (groups.length === 0 && !fixedGroup) {
    return (
      <div className="border-border bg-card flex flex-col items-start gap-3 rounded-2xl border p-4">
        <p className="text-sm">{es.community.threadForm.noGroups}</p>
        <Button size="lg" asChild>
          <Link href="/grupos">{es.community.directoryTitle}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        {!fixedGroup && groups.length > 1 ? (
          <FieldSet>
            <FieldLegend variant="label">
              {es.community.threadForm.groupLabel}
            </FieldLegend>
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => {
                const selected = group.id === groupId;
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={selected}
                    data-testid={`thread-group-${group.slug}`}
                    className={cn(
                      chipStyles,
                      selected ? chipSelected : chipIdle,
                    )}
                    onClick={() => setGroupId(group.id)}
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>
            <FieldDescription>
              {es.community.threadForm.groupHint}
            </FieldDescription>
          </FieldSet>
        ) : null}

        {allowedTypes.length > 1 ? (
          <FieldSet>
            <FieldLegend variant="label">
              {es.community.threadForm.typeLabel}
            </FieldLegend>
            <div className="flex flex-wrap gap-2">
              {allowedTypes.map((value) => {
                const selected = value === type;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    data-testid={`thread-type-${value}`}
                    className={cn(
                      chipStyles,
                      selected ? chipSelected : chipIdle,
                    )}
                    onClick={() => setType(value)}
                  >
                    {threadTypeLabel(value)}
                  </button>
                );
              })}
            </div>
          </FieldSet>
        ) : null}

        <Field>
          <FieldLabel htmlFor="thread-title">
            {es.community.threadForm.titleLabel}
          </FieldLabel>
          <Input
            id="thread-title"
            maxLength={THREAD_TITLE_MAX}
            placeholder={es.community.threadForm.titlePlaceholder}
            value={title}
            data-testid="thread-title-input"
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="thread-body">
            {es.community.threadForm.bodyLabel}
          </FieldLabel>
          <Textarea
            id="thread-body"
            rows={6}
            maxLength={THREAD_BODY_MAX}
            placeholder={es.community.threadForm.bodyPlaceholder}
            value={body}
            data-testid="thread-body-input"
            onChange={(event) => setBody(event.target.value)}
          />
        </Field>

        {project ? (
          <div
            className="border-border bg-muted/30 flex flex-col gap-2 rounded-2xl border p-3"
            data-testid="thread-project-preview"
          >
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              {es.community.askHelp.projectLabel}
            </span>
            <span className="flex items-center gap-3">
              {project.cover?.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura pública de R2
                <img
                  src={project.cover.thumbUrl}
                  alt=""
                  className="border-border size-16 shrink-0 rounded-xl border object-cover"
                />
              ) : null}
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{project.name}</span>
                {project.patternName ? (
                  <span className="text-muted-foreground truncate text-sm">
                    {es.community.askHelp.patternPrefix.replace(
                      "{name}",
                      project.patternName,
                    )}
                  </span>
                ) : null}
              </span>
            </span>
            <p className="text-muted-foreground text-xs">
              {es.community.threadForm.projectNote}
            </p>
          </div>
        ) : null}

        <Field>
          <FieldLabel>{es.community.threadForm.photosLabel}</FieldLabel>
          {pending.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pending.map((photo, index) => (
                <span key={photo.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local */}
                  <img
                    src={photo.url}
                    alt=""
                    className="border-border h-20 w-16 rounded-lg border object-cover"
                  />
                  <button
                    type="button"
                    aria-label={es.community.threadForm.photosRemove}
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
            aria-label={es.community.threadForm.photosAdd}
            onChange={(event) => addFiles(event.target.files)}
          />
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-fit"
            disabled={busy || pending.length >= THREAD_PHOTOS_MAX}
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus aria-hidden="true" />
            {es.community.threadForm.photosAdd}
          </Button>
          <FieldDescription>
            {es.community.threadForm.photosMax}
          </FieldDescription>
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={busy}
            data-testid="thread-submit"
          >
            {busy
              ? es.community.threadForm.saving
              : es.community.threadForm.submit}
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href={cancelHref}>{es.community.threadForm.cancel}</Link>
          </Button>
          {status ? (
            <span role="status" className="text-muted-foreground text-sm">
              {status}
            </span>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
