"use client";

import { ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { POST_BODY_MAX, THREAD_PHOTOS_MAX } from "@/db/community-schema";
import { uploadPhoto } from "@/features/projects/upload-photo";
import { es } from "@/messages/es";

import { createPost } from "../thread-actions";

/**
 * Formulario de respuesta (spec §5.9): texto y hasta cuatro fotos. Las fotos
 * suben con el destino `hilo` y quedan adjuntas a la respuesta.
 */
export function ReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);

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

  function reset() {
    pending.forEach((photo) => URL.revokeObjectURL(photo.url));
    urlsRef.current = [];
    setPending([]);
    setBody("");
  }

  async function submit() {
    if (body.trim().length === 0 && pending.length === 0) {
      toast.error(es.community.errors.emptyPost);
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
      const result = await createPost({
        threadId,
        body: body.trim(),
        imageIds,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(es.community.replyPosted);
      reset();
      router.refresh();
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className="flex flex-col gap-4"
      data-testid="reply-form"
    >
      <Field>
        <FieldLabel htmlFor="reply-body">{es.community.replyCta}</FieldLabel>
        <Textarea
          id="reply-body"
          rows={4}
          maxLength={POST_BODY_MAX}
          placeholder={es.community.replyPlaceholder}
          value={body}
          data-testid="reply-body-input"
          onChange={(event) => setBody(event.target.value)}
        />
      </Field>

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

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={busy}
          data-testid="reply-submit"
        >
          {busy ? es.community.threadForm.saving : es.community.replySubmit}
        </Button>
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
        <FieldDescription>{es.community.threadForm.photosMax}</FieldDescription>
        {status ? (
          <span role="status" className="text-muted-foreground text-sm">
            {status}
          </span>
        ) : null}
      </div>
    </form>
  );
}
