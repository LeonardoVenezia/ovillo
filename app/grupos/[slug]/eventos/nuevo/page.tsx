import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventForm } from "@/features/community/components/event-form";
import { listEventPatternOptions } from "@/features/community/event-queries";
import { getGroupBySlug } from "@/features/community/queries";
import {
  canOrganizeEvent,
  emptyEventValues,
} from "@/features/community/schemas";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Nuevo KAL/CAL (spec §5.10, `/grupos/slug/eventos/nuevo`). Ruta privada: el
 * proxy manda a ingresar sin sesión y el formulario solo se muestra a la
 * moderación del grupo (D-056); la acción revalida igual.
 */

type Props = PageProps<"/grupos/[slug]/eventos/nuevo">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  return group
    ? { title: `${es.community.events.form.newTitle} · ${group.name}` }
    : {};
}

export default async function NewEventPage({ params }: Props) {
  const { slug } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewEventView slug={slug} />
      </Suspense>
    </section>
  );
}

async function NewEventView({ slug }: { slug: string }) {
  const user = await requireUser();
  const group = await getGroupBySlug(slug, user.id);
  if (!group) {
    notFound();
  }

  const patterns = canOrganizeEvent(group.viewerRole)
    ? await listEventPatternOptions()
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
          {es.community.events.form.newTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {es.community.events.form.newIntro}
        </p>
      </div>

      {canOrganizeEvent(group.viewerRole) ? (
        <EventForm
          mode="create"
          groupId={group.id}
          slug={group.slug}
          initial={emptyEventValues}
          patterns={patterns}
          cancelHref={`/grupos/${group.slug}`}
        />
      ) : (
        <div className="border-border bg-card flex flex-col items-start gap-3 rounded-2xl border p-4">
          <p className="text-sm">{es.community.events.onlyMods}</p>
          <Button size="lg" variant="outline" asChild>
            <Link href={`/grupos/${group.slug}`}>{group.name}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
