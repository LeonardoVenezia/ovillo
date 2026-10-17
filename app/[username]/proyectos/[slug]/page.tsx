import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { USERNAME_PATTERN } from "@/features/auth/schemas";
import { ProjectPublicCard } from "@/features/projects/components/project-public-card";
import {
  getProjectByUsername,
  type PublicProjectPage,
} from "@/features/projects/queries";
import { getOptionalUser } from "@/lib/session";

/**
 * Página pública de un proyecto (spec §5.3: "vista pública sin login").
 *
 * Vive debajo de `/[username]`, igual que el perfil, y acepta la arroba
 * (`/@maria/proyectos/gorro-azul`). El proxy chequea que el proyecto exista
 * para poder responder 404 de verdad; acá solo queda decidir qué ve cada
 * visitante: los privados son solo para su dueña.
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
  return {
    title: `${data.project.name} · @${clean}`,
    robots:
      data.project.visibility === "privado" ? { index: false } : undefined,
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

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<ProjectPublicCard data={data} isOwner={false} />}>
        <ViewerAwareProject data={data} />
      </Suspense>
    </section>
  );
}

async function ViewerAwareProject({ data }: { data: PublicProjectPage }) {
  const viewer = await getOptionalUser();
  return (
    <ProjectPublicCard
      data={data}
      isOwner={viewer?.id === data.project.userId}
    />
  );
}
