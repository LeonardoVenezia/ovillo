"use server";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { image, projectEntry, projectPhoto } from "@/db/media-schema";
import { project } from "@/db/project-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";
import { deleteObject } from "@/storage";

import { entryInputSchema, isReasonableEntryDate } from "./media-schemas";
import { thumbKeyFor } from "./media-view";

/**
 * Acciones de fotos y diario (spec §5.3, §9: Zod + autorización en cada
 * mutación). La subida vive en `app/api/fotos/route.ts` porque maneja
 * binarios; acá quedan el orden, la portada y el borrado.
 */

export type MediaActionResult = { ok: true } | { ok: false; error: string };

/** Foto propia con su proyecto: autorización en un solo lugar. */
async function getOwnPhoto(userId: string, photoId: string) {
  const rows = await getDb()
    .select({ photo: projectPhoto, image, project })
    .from(projectPhoto)
    .innerJoin(image, eq(projectPhoto.imageId, image.id))
    .innerJoin(project, eq(projectPhoto.projectId, project.id))
    .where(
      and(
        eq(projectPhoto.id, photoId),
        eq(project.userId, userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Borra la foto y su miniatura; mejor esfuerzo (si R2 falla, se registra). */
async function deleteR2Image(r2Key: string): Promise<void> {
  const results = await Promise.allSettled([
    deleteObject(r2Key),
    deleteObject(thumbKeyFor(r2Key)),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("R2: no se pudo borrar una foto:", result.reason);
    }
  }
}

/** Elimina una foto de la galería (y su portada si era la elegida). */
export async function deleteProjectPhoto(
  photoId: string,
): Promise<MediaActionResult> {
  const user = await requireUser();
  const own = await getOwnPhoto(user.id, photoId);
  if (!own) {
    return { ok: false, error: es.projects.photos.errors.generic };
  }

  await deleteR2Image(own.image.r2Key);
  await getDb().delete(projectPhoto).where(eq(projectPhoto.id, own.photo.id));

  if (own.project.coverImageId === own.image.id) {
    const [next] = await getDb()
      .select({ imageId: projectPhoto.imageId })
      .from(projectPhoto)
      .where(eq(projectPhoto.projectId, own.project.id))
      .orderBy(asc(projectPhoto.position), asc(projectPhoto.createdAt))
      .limit(1);
    await getDb()
      .update(project)
      .set({ coverImageId: next?.imageId ?? null })
      .where(eq(project.id, own.project.id));
  }

  await getDb().delete(image).where(eq(image.id, own.image.id));
  return { ok: true };
}

/** Marca una foto de la galería como portada del proyecto. */
export async function setProjectCover(
  photoId: string,
): Promise<MediaActionResult> {
  const user = await requireUser();
  const own = await getOwnPhoto(user.id, photoId);
  if (!own) {
    return { ok: false, error: es.projects.photos.errors.generic };
  }

  await getDb()
    .update(project)
    .set({ coverImageId: own.image.id })
    .where(eq(project.id, own.project.id));

  return { ok: true };
}

/** Mueve una foto una posición: `-1` antes, `1` después. */
export async function moveProjectPhoto(
  photoId: string,
  direction: -1 | 1,
): Promise<MediaActionResult> {
  const user = await requireUser();
  if (direction !== -1 && direction !== 1) {
    return { ok: false, error: es.projects.photos.errors.generic };
  }

  const own = await getOwnPhoto(user.id, photoId);
  if (!own) {
    return { ok: false, error: es.projects.photos.errors.generic };
  }

  const photos = await getDb()
    .select({ id: projectPhoto.id })
    .from(projectPhoto)
    .where(eq(projectPhoto.projectId, own.project.id))
    .orderBy(asc(projectPhoto.position), asc(projectPhoto.createdAt));

  const index = photos.findIndex((row) => row.id === own.photo.id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= photos.length) {
    return { ok: true };
  }

  const reordered = [...photos];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  // Normaliza las posiciones a 0..n-1: simple y sin huecos.
  await Promise.all(
    reordered.map((row, position) =>
      getDb()
        .update(projectPhoto)
        .set({ position })
        .where(eq(projectPhoto.id, row.id)),
    ),
  );

  return { ok: true };
}

/** Guarda una entrada del diario (texto y/o fotos ya subidas). */
export async function saveProjectEntry(
  input: unknown,
): Promise<MediaActionResult> {
  const user = await requireUser();
  const parsed = entryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.projects.diary.errors.generic };
  }

  const { projectId, entryDate, body, imageIds } = parsed.data;
  if (!isReasonableEntryDate(entryDate)) {
    return { ok: false, error: es.projects.diary.errors.dateInvalid };
  }

  const rows = await getDb()
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, user.id),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);
  if (!rows[0]) {
    return { ok: false, error: es.projects.diary.errors.generic };
  }

  if (imageIds.length > 0) {
    const owned = await getDb()
      .select({ id: image.id })
      .from(image)
      .where(and(inArray(image.id, imageIds), eq(image.ownerId, user.id)));
    if (owned.length !== imageIds.length) {
      return { ok: false, error: es.projects.diary.errors.generic };
    }
  }

  await getDb().insert(projectEntry).values({
    projectId,
    entryDate,
    body,
    imageIds,
  });

  return { ok: true };
}

/** Elimina una entrada del diario junto con sus fotos. */
export async function deleteProjectEntry(
  entryId: string,
): Promise<MediaActionResult> {
  const user = await requireUser();
  const rows = await getDb()
    .select({ entry: projectEntry })
    .from(projectEntry)
    .innerJoin(project, eq(projectEntry.projectId, project.id))
    .where(
      and(
        eq(projectEntry.id, entryId),
        eq(project.userId, user.id),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  const own = rows[0];
  if (!own) {
    return { ok: false, error: es.projects.diary.errors.generic };
  }

  if (own.entry.imageIds.length > 0) {
    const images = await getDb()
      .select()
      .from(image)
      .where(inArray(image.id, own.entry.imageIds));
    await Promise.allSettled(images.map((row) => deleteR2Image(row.r2Key)));
    await getDb().delete(image).where(inArray(image.id, own.entry.imageIds));
  }

  await getDb().delete(projectEntry).where(eq(projectEntry.id, own.entry.id));
  return { ok: true };
}
