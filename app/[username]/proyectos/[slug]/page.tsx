import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { USERNAME_PATTERN } from "@/features/auth/schemas";
import { ProjectPublicCard } from "@/features/projects/components/project-public-card";
import {
  getImageById,
  listProjectEntries,
  listProjectPhotos,
} from "@/features/projects/media-queries";
import {
  toEntryViews,
  toPhotoViews,
  type DiaryEntryView,
  type PhotoView,
} from "@/features/projects/media-view";
import {
  getProjectByUsername,
  type PublicProjectPage,
} from "@/features/projects/queries";
import { SaveToggle } from "@/features/saved/components/save-toggle";
import { getSavedItem } from "@/features/saved/queries";
import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";
import { getPublicUrl } from "@/storage";

/**
 * Página pública de un proyecto (spec §5.3: "vista pública sin login").
 *
 * Vive debajo de `/[username]`, igual que el perfil, y acepta la arroba
 * (`/@maria/proyectos/gorro-azul`). El proxy chequea que el proyecto exista
 * para poder responder 404 de verdad; acá solo queda decidir qué ve cada
 * visitante: los privados son solo para su dueña. El diario y la galería se
 * muestran tal cual (la privacidad es por proyecto); el Open Graph usa la
 * foto de portada.
 */

export const instant = false;

type Props = PageProps<"/[username]/proyectos/[slug]">;

function normalizeUsername(raw: string): string | null {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const username = (decoded.startsWith("@") ? decoded.slice(1) : decoded)
    .trim()
    .toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  const clean = normalizeUsername(username);
  if (!clean) {
    return {};
  }
  const data = await getProjectByUsername(clean, slug);
  if (!data) {
    return {};
  }

  const cover = data.project.coverImageId
    ? await getImageById(data.project.coverImageId)
    : null;
  const publicUrl = getPublicUrl();
  const coverUrl = cover && publicUrl ? `${publicUrl}/${cover.r2Key}` : null;
  const description = data.project.notes?.replace(/\s+/g, " ").trim();

  return {
    title: `${data.project.name} · @${clean}`,
    description:
      description && description.length > 0
        ? description.slice(0, 160)
        : es.projects.publicOgFallback,
    robots:
      data.project.visibility === "privado" ? { index: false } : undefined,
    openGraph: coverUrl
      ? {
          images: [{ url: coverUrl, alt: cover?.altText ?? data.project.name }],
        }
      : undefined,
  };
}

export default async function PublicProjectPage({ params }: Props) {
  const { username, slug } = await params;
  const clean = normalizeUsername(username);
  if (!clean) {
    notFound();
  }

  const data = await getProjectByUsername(clean, slug);
  if (!data) {
    notFound();
  }

  const [photos, entries] = await Promise.all([
    listProjectPhotos(data.project.id),
    listProjectEntries(data.project.id),
  ]);
  const photoViews = toPhotoViews(photos);
  const entryViews = toEntryViews(entries);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense
        fallback={
          <ProjectPublicCard
            data={data}
            isOwner={false}
            photos={photoViews}
            entries={entryViews}
          />
        }
      >
        <ViewerAwareProject
          data={data}
          photos={photoViews}
          entries={entryViews}
        />
      </Suspense>
    </section>
  );
}

async function ViewerAwareProject({
  data,
  photos,
  entries,
}: {
  data: PublicProjectPage;
  photos: PhotoView[];
  entries: DiaryEntryView[];
}) {
  const viewer = await getOptionalUser();
  const saved = viewer
    ? await getSavedItem(viewer.id, "proyecto", data.project.id)
    : null;

  return (
    <>
      <ProjectPublicCard
        data={data}
        isOwner={viewer?.id === data.project.userId}
        photos={photos}
        entries={entries}
      />
      <div className="flex flex-wrap gap-3">
        <SaveToggle
          targetType="proyecto"
          targetId={data.project.id}
          initialSavedItemId={saved?.id ?? null}
          signedIn={Boolean(viewer)}
        />
      </div>
    </>
  );
}
