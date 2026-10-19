import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/features/community/components/event-card";
import { listEvents } from "@/features/community/event-queries";
import { getGroupBySlug } from "@/features/community/queries";
import { es } from "@/messages/es";

/**
 * Todos los KAL/CAL de un grupo (spec §5.10, `/grupos/slug/eventos`). Lectura
 * pública y al momento, como los hilos (D-056): primero los que están en
 * curso, después los próximos y al final los terminados.
 */

type Props = PageProps<"/grupos/[slug]/eventos">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  return group
    ? { title: `${group.name} · ${es.community.events.allTitle}` }
    : {};
}

export default async function GroupEventsPage({ params }: Props) {
  const { slug } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EventsView slug={slug} />
      </Suspense>
    </section>
  );
}

async function EventsView({ slug }: { slug: string }) {
  const group = await getGroupBySlug(slug);
  if (!group) {
    notFound();
  }

  const events = await listEvents({ groupId: group.id });

  return (
    <div className="flex flex-col gap-6" data-testid="group-events">
      <div className="flex flex-col gap-1">
        <Link
          href={`/grupos/${group.slug}`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← {group.name}
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.community.events.allTitle}
        </h1>
      </div>

      {events.length > 0 ? (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {es.community.events.empty}
        </p>
      )}
    </div>
  );
}
