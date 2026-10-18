import { createId } from "@paralleldrive/cuid2";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { image, projectPhoto } from "@/db/media-schema";
import { project } from "@/db/project-schema";
import { stashItem } from "@/db/stash-schema";
import {
  checkImageUpload,
  isUploadPurpose,
  type UploadError,
} from "@/features/projects/media-schemas";
import { thumbKeyFor, toPhotoView } from "@/features/projects/media-view";
import { getUserFromRequest } from "@/lib/session";
import { es } from "@/messages/es";
import { deleteObject, putObject } from "@/storage";

/**
 * Subida de fotos (spec §5.3 y §9: los Route Handlers quedan para binarios).
 *
 * El navegador manda la foto ya comprimida (≤ 1600 px, JPEG) junto con su
 * miniatura; acá se aplican los topes duros antes de guardar en R2. Cada
 * imagen se sube de a una (la UI hace la cola). Hay dos destinos: el proyecto
 * (galería o entrada del diario) y el inventario de lana (una foto por lana,
 * D-046; si había otra, se reemplaza y se borra la anterior).
 */

function errorResponse(error: UploadError, status = 400) {
  const messages: Record<UploadError, string> = {
    type: es.projects.photos.errors.type,
    weight: es.projects.photos.errors.weight,
    size: es.projects.photos.errors.size,
    limit: es.projects.photos.errors.limit,
  };
  return NextResponse.json({ ok: false, error: messages[error] }, { status });
}

/** Borra los objetos de una foto en R2, mejor esfuerzo. */
async function deleteR2Objects(r2Key: string): Promise<void> {
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

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: es.projects.photos.errors.session },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: es.projects.photos.errors.generic },
      { status: 400 },
    );
  }

  const projectId = form.get("projectId");
  const stashItemId = form.get("stashItemId");
  const purpose = form.get("purpose");
  const full = form.get("file");
  const thumb = form.get("thumb");
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  const alt = form.get("alt");

  if (
    typeof purpose !== "string" ||
    !isUploadPurpose(purpose) ||
    !(full instanceof File) ||
    !(thumb instanceof File)
  ) {
    return NextResponse.json(
      { ok: false, error: es.projects.photos.errors.generic },
      { status: 400 },
    );
  }

  // Foto del inventario: una sola por lana; si había, se reemplaza.
  if (purpose === "lana") {
    if (typeof stashItemId !== "string") {
      return NextResponse.json(
        { ok: false, error: es.projects.photos.errors.generic },
        { status: 400 },
      );
    }

    const stashRows = await getDb()
      .select()
      .from(stashItem)
      .where(and(eq(stashItem.id, stashItemId), eq(stashItem.userId, user.id)))
      .limit(1);
    const ownStash = stashRows[0];
    if (!ownStash) {
      return NextResponse.json(
        { ok: false, error: es.stash.errors.notFound },
        { status: 404 },
      );
    }

    const check = checkImageUpload({
      purpose,
      mime: full.type,
      fullBytes: full.size,
      thumbBytes: thumb.size,
      width,
      height,
    });
    if (!check.ok) {
      return errorResponse(check.error);
    }

    const imageId = createId();
    const r2Key = `lanas/${ownStash.id}/${imageId}.jpg`;
    await putObject(
      r2Key,
      new Uint8Array(await full.arrayBuffer()),
      "image/jpeg",
    );
    await putObject(
      thumbKeyFor(r2Key),
      new Uint8Array(await thumb.arrayBuffer()),
      "image/jpeg",
    );

    const [inserted] = await getDb()
      .insert(image)
      .values({
        id: imageId,
        ownerId: user.id,
        r2Key,
        width,
        height,
        altText:
          typeof alt === "string" && alt.trim().length > 0
            ? alt.trim().slice(0, 200)
            : null,
      })
      .returning();

    const previous = ownStash.imageId
      ? await getDb()
          .select({ id: image.id, r2Key: image.r2Key })
          .from(image)
          .where(eq(image.id, ownStash.imageId))
          .limit(1)
      : [];

    await getDb()
      .update(stashItem)
      .set({ imageId })
      .where(eq(stashItem.id, ownStash.id));

    if (previous[0]) {
      await deleteR2Objects(previous[0].r2Key);
      await getDb().delete(image).where(eq(image.id, previous[0].id));
    }

    return NextResponse.json({ ok: true, photo: toPhotoView(inserted) });
  }

  // Galería o entrada del diario: van dentro de un proyecto propio.
  if (typeof projectId !== "string") {
    return NextResponse.json(
      { ok: false, error: es.projects.photos.errors.generic },
      { status: 400 },
    );
  }

  const ownRows = await getDb()
    .select()
    .from(project)
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, user.id),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);
  const own = ownRows[0];
  if (!own) {
    return NextResponse.json(
      { ok: false, error: es.projects.errors.notFound },
      { status: 404 },
    );
  }

  let galleryCount = 0;
  if (purpose === "galeria") {
    const [totals] = await getDb()
      .select({ value: count() })
      .from(projectPhoto)
      .where(eq(projectPhoto.projectId, own.id));
    galleryCount = totals?.value ?? 0;
  }

  const check = checkImageUpload({
    purpose,
    mime: full.type,
    fullBytes: full.size,
    thumbBytes: thumb.size,
    width,
    height,
    galleryCount,
  });
  if (!check.ok) {
    return errorResponse(check.error);
  }

  const imageId = createId();
  const r2Key = `proyectos/${own.id}/${imageId}.jpg`;
  await putObject(
    r2Key,
    new Uint8Array(await full.arrayBuffer()),
    "image/jpeg",
  );
  await putObject(
    thumbKeyFor(r2Key),
    new Uint8Array(await thumb.arrayBuffer()),
    "image/jpeg",
  );

  const [inserted] = await getDb()
    .insert(image)
    .values({
      id: imageId,
      ownerId: user.id,
      r2Key,
      width,
      height,
      altText:
        typeof alt === "string" && alt.trim().length > 0
          ? alt.trim().slice(0, 200)
          : null,
    })
    .returning();

  if (purpose === "galeria") {
    const [last] = await getDb()
      .select({ position: projectPhoto.position })
      .from(projectPhoto)
      .where(eq(projectPhoto.projectId, own.id))
      .orderBy(desc(projectPhoto.position))
      .limit(1);

    await getDb()
      .insert(projectPhoto)
      .values({
        projectId: own.id,
        imageId,
        position: (last?.position ?? -1) + 1,
      });

    // La primera foto es la portada hasta que se elija otra.
    if (!own.coverImageId) {
      await getDb()
        .update(project)
        .set({ coverImageId: imageId })
        .where(eq(project.id, own.id));
    }
  }

  return NextResponse.json({ ok: true, photo: toPhotoView(inserted) });
}
