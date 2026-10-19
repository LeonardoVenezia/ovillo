import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EventForm } from "@/features/community/components/event-form";
import {
  getEventById,
  listEventPatternOptions,
} from "@/features/community/event-queries";
import { canOrganizeEvent } from "@/features/community/schemas";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Editar un KAL/CAL (spec §5.10, `/grupos/slug/eventos/id/editar`). Ruta
 * privada: solo la moderación del grupo; los cambios también actualizan el
 * hilo del evento (D-056).
 */

type Props = PageProps<"/grupos/[slug]/eventos/[id]/editar">;

export const instant = false;

export const metadata: Metadata = {
  title: es.community.events.form.editTitle,
};

export default async function EditEventPage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditEventView slug={slug} id={id} />
      </Suspense>
    </section>
  );
}

async function EditEventView({ slug, id }: { slug: string; id: string }) {
  const user = await requireUser();
  const event = await getEventById(id, user.id);
  if (
    !event ||
    event.group.slug !== slug ||
    !canOrganizeEvent(event.viewerRole)
  ) {
    notFound();
  }

  const patterns = await listEventPatternOptions();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm">{event.group.name}</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.community.events.form.editTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {es.community.events.form.editIntro}
        </p>
      </div>

      <EventForm
        mode="edit"
        groupId={event.group.id}
        slug={event.group.slug}
        eventId={event.id}
        initial={{
          name: event.name,
          craft: event.craft,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          description: event.description,
          patternIds: event.patterns.map((pattern) => pattern.id),
          stages: event.stages,
        }}
        patterns={patterns}
        cancelHref={`/grupos/${event.group.slug}/eventos/${event.id}`}
      />
    </div>
  );
}
