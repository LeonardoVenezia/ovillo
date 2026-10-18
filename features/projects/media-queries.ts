import { asc, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { image, projectEntry, projectPhoto } from "@/db/media-schema";

/**
 * Consultas de fotos y diario (spec §5.3). Las páginas que las usan son
 * dinámicas, así que siempre reflejan lo último guardado.
 */

export type ImageRow = typeof image.$inferSelect;
export type ProjectEntryRow = typeof projectEntry.$inferSelect;

export type ProjectPhotoWithImage = {
  photoId: string;
  image: ImageRow;
};

/** Galería de un proyecto, en el orden elegido. */
export async function listProjectPhotos(
  projectId: string,
): Promise<ProjectPhotoWithImage[]> {
  return getDb()
    .select({ photoId: projectPhoto.id, image })
    .from(projectPhoto)
    .innerJoin(image, eq(projectPhoto.imageId, image.id))
    .where(eq(projectPhoto.projectId, projectId))
    .orderBy(asc(projectPhoto.position), asc(projectPhoto.createdAt));
}

export type ProjectEntryWithImages = {
  entry: ProjectEntryRow;
  images: ImageRow[];
};

/** Diario de un proyecto: lo más reciente primero. */
export async function listProjectEntries(
  projectId: string,
): Promise<ProjectEntryWithImages[]> {
  const entries = await getDb()
    .select()
    .from(projectEntry)
    .where(eq(projectEntry.projectId, projectId))
    .orderBy(desc(projectEntry.entryDate), desc(projectEntry.createdAt));

  const ids = [...new Set(entries.flatMap((entry) => entry.imageIds))];
  const images =
    ids.length > 0
      ? await getDb().select().from(image).where(inArray(image.id, ids))
      : [];
  const byId = new Map(images.map((row) => [row.id, row]));

  return entries.map((entry) => ({
    entry,
    images: entry.imageIds
      .map((id) => byId.get(id))
      .filter((row): row is ImageRow => row !== undefined),
  }));
}

/** Una foto puntual (por ejemplo, la portada para Open Graph). */
export async function getImageById(id: string): Promise<ImageRow | null> {
  const rows = await getDb()
    .select()
    .from(image)
    .where(eq(image.id, id))
    .limit(1);
  return rows[0] ?? null;
}
