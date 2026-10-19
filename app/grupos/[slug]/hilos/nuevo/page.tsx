import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { THREAD_TYPES } from "@/db/community-schema";
import { ThreadForm } from "@/features/community/components/thread-form";
import { getGroupBySlug } from "@/features/community/queries";
import { canCreateThreadType } from "@/features/community/schemas";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Abrir un hilo en un grupo (spec §5.9, `/grupos/slug/hilos/nuevo`). Ruta
 * privada: el proxy manda a ingresar sin sesión y la acción revalida siempre.
 * Solo pueden publicar quienes ya integran el grupo (D-055); la moderación
 * además puede publicar anuncios.
 */

type Props = PageProps<"/grupos/[slug]/hilos/nuevo">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  return group
    ? { title: `${es.community.threadForm.newTitle} · ${group.name}` }
    : {};
}

export default async function NewThreadPage({ params }: Props) {
  const { slug } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewThreadView slug={slug} />
      </Suspense>
    </section>
  );
}

async function NewThreadView({ slug }: { slug: string }) {
  const user = await requireUser();
  const group = await getGroupBySlug(slug, user.id);
  if (!group) {
    notFound();
  }

  const allowedTypes = group.viewerRole
    ? THREAD_TYPES.filter((type) => canCreateThreadType(group.viewerRole, type))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/grupos/${group.slug}`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← {group.name}
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.community.threadForm.newTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {es.community.threadForm.newIntro}
        </p>
      </div>

      {group.viewerRole ? (
        <ThreadForm
          groups={[]}
          fixedGroup={{ id: group.id, slug: group.slug, name: group.name }}
          allowedTypes={allowedTypes}
          cancelHref={`/grupos/${group.slug}`}
        />
      ) : (
        <div className="border-border bg-card flex flex-col items-start gap-2 rounded-2xl border p-4">
          <p className="text-sm">{es.community.membersOnlyWrite}</p>
          {group.viewerPending ? (
            <p className="text-muted-foreground text-sm">
              {es.community.pendingHint}
            </p>
          ) : null}
          <Button size="lg" variant="outline" asChild>
            <Link href={`/grupos/${group.slug}`}>{group.name}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
