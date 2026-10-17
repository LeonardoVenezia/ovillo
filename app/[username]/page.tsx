import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { USERNAME_PATTERN } from "@/features/auth/schemas";
import { ProfileCard } from "@/features/profile/components/profile-card";
import {
  getPublicProfileByUsername,
  type PublicProfile,
} from "@/features/profile/queries";
import { ProfileProjects } from "@/features/projects/components/profile-projects";
import { getOptionalUser } from "@/lib/session";

/**
 * Perfil público (spec §5.2, `/@usuario`).
 *
 * Las carpetas que empiezan con `@` son "slots" en App Router, así que la
 * URL `/@usuario` se atiende desde este segmento dinámico: acepta con y sin
 * arroba (`/@maria` y `/maria`) y cualquier otra cosa termina en 404. El
 * valor del segmento llega codificado (`%40`), así que lo decodificamos.
 *
 * La URL recién se conoce en la petición (y la barra inferior usa
 * `usePathname`), así que esta ruta se permite "bloquear" en la navegación
 * en vez de prerenderizar un caparazón imposible (guía `instant`). El
 * chequeo existe/404 corre antes de transmitir para que el estado sea real;
 * lo único que espera es la sesión (para el botón de edición).
 */

type Props = PageProps<"/[username]">;

export const instant = false;

function normalizeSegment(raw: string): string | null {
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
  const { username } = await params;
  const clean = normalizeSegment(username);
  return clean ? { title: `@${clean}` } : {};
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const clean = normalizeSegment(username);
  if (!clean) {
    notFound();
  }

  const data = await getPublicProfileByUsername(clean);
  if (!data) {
    notFound();
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<ProfileCard data={data} isOwner={false} />}>
        <OwnerProfileCard data={data} />
      </Suspense>
      <Suspense fallback={null}>
        <ProfileProjectsSection data={data} />
      </Suspense>
    </section>
  );
}

async function OwnerProfileCard({ data }: { data: PublicProfile }) {
  const viewer = await getOptionalUser();
  return <ProfileCard data={data} isOwner={viewer?.id === data.user.id} />;
}

/**
 * La sección de proyectos respeta la misma regla que la tarjeta: en perfiles
 * privados solo la ve su dueña. Sin @usuario no hay URLs públicas que armar.
 */
async function ProfileProjectsSection({ data }: { data: PublicProfile }) {
  const viewer = await getOptionalUser();
  const isOwner = viewer?.id === data.user.id;
  const detailsVisible =
    !data.profile || data.profile.defaultVisibility !== "privado" || isOwner;
  if (!detailsVisible || !data.user.username) {
    return null;
  }
  return (
    <ProfileProjects userId={data.user.id} username={data.user.username} />
  );
}
