import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EventJoinButton } from "@/features/community/components/event-join-button";
import { EventParticipants } from "@/features/community/components/event-participants";
import { ReplyForm } from "@/features/community/components/reply-form";
import { ThreadModActions } from "@/features/community/components/thread-mod-actions";
import { ThreadPhotos } from "@/features/community/components/thread-photos";
import {
  eventCraftLabel,
  eventDatesLabel,
  eventFinishedLabel,
  eventParticipantsLabel,
  eventStageLabel,
  eventStatusLabel,
  repliesLabel,
  whenLabel,
} from "@/features/community/format";
import {
  getEventById,
  listOwnProjectOptions,
} from "@/features/community/event-queries";
import { canModerate } from "@/features/community/schemas";
import { listPosts } from "@/features/community/thread-queries";
import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Ficha de un KAL/CAL (spec §5.10, `/grupos/slug/eventos/id`): fechas,
 * patrones, etapas, participantes con su proyecto y la conversación en el
 * hilo propio del evento. El proxy ya chequeó que el grupo y el evento
 * existan (D-023); acá se lee al momento porque el estado cambia con cada
 * participante y respuesta (D-056).
 */

type Props = PageProps<"/grupos/[slug]/eventos/[id]">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  return event ? { title: event.name } : {};
}

export default async function EventPage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EventView slug={slug} id={id} />
      </Suspense>
    </section>
  );
}

async function EventView({ slug, id }: { slug: string; id: string }) {
  const user = await getOptionalUser();
  const event = await getEventById(id, user?.id);
  if (!event || event.group.slug !== slug) {
    notFound();
  }

  const posts = await listPosts(event.threadId);
  const moderates = canModerate(event.viewerRole);
  const myProjects = user ? await listOwnProjectOptions(user.id) : [];
  const signInHref = `/ingresar?volver=${encodeURIComponent(
    `/grupos/${event.group.slug}/eventos/${event.id}`,
  )}`;

  return (
    <div className="flex flex-col gap-6" data-testid="event-view">
      <Link
        href={`/grupos/${event.group.slug}`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        ← {event.group.name}
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{eventCraftLabel(event.craft)}</Badge>
          <Badge
            variant={event.status === "en-curso" ? "default" : "outline"}
            data-testid="event-status"
          >
            {eventStatusLabel(event.status)}
          </Badge>
          {event.threadLocked ? (
            <Badge variant="outline">{es.community.lockedBadge}</Badge>
          ) : null}
        </div>

        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {event.name}
        </h1>

        <p className="text-muted-foreground text-sm" data-testid="event-meta">
          {es.community.events.organizer}{" "}
          {event.organizer.username ? (
            <Link
              href={`/@${event.organizer.username}`}
              className="underline underline-offset-4"
            >
              {event.organizer.name}
            </Link>
          ) : (
            event.organizer.name
          )}{" "}
          · {eventDatesLabel(event.startsAt, event.endsAt)} ·{" "}
          {eventParticipantsLabel(event.participants.length)} ·{" "}
          {eventFinishedLabel(event.finished, event.participants.length)}
        </p>
      </div>

      {event.description ? (
        <p className="text-sm whitespace-pre-line">{event.description}</p>
      ) : null}

      {event.patterns.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold">
            {es.community.events.patternsTitle}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {event.patterns.map((pattern) => (
              <li key={pattern.id}>
                <Link
                  href={`/patrones/${pattern.slug}`}
                  className="border-border bg-card hover:bg-muted/40 flex rounded-xl border px-3 py-2 text-sm"
                  data-testid="event-pattern"
                >
                  {pattern.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {event.stages.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold">
            {es.community.events.stagesTitle}
          </h2>
          <ol className="flex flex-col gap-2" data-testid="event-stages-list">
            {event.stages.map((stage, index) => (
              <li
                key={`${index}-${stage.title}`}
                className="border-border bg-card flex flex-col gap-1 rounded-2xl border p-3"
                data-testid="event-stage"
              >
                <span className="text-sm font-medium">
                  {eventStageLabel(index)} · {stage.title}
                </span>
                {stage.note ? (
                  <span className="text-muted-foreground text-sm">
                    {stage.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {user ? (
        event.viewerRole ? (
          <EventJoinButton
            eventId={event.id}
            initialProjectId={event.viewerProjectId}
            projects={myProjects}
          />
        ) : (
          <div className="border-border bg-card flex flex-col items-start gap-2 rounded-2xl border p-4">
            <p className="text-sm">{es.community.events.memberOnlyJoin}</p>
            {event.viewerPending ? (
              <p className="text-muted-foreground text-sm">
                {es.community.pendingHint}
              </p>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link
                href={`/grupos/${event.group.slug}`}
                data-testid="event-go-group"
              >
                {event.group.name}
              </Link>
            </Button>
          </div>
        )
      ) : (
        <div className="border-border bg-card flex flex-col items-start gap-3 rounded-2xl border p-4">
          <Button asChild>
            <Link href={signInHref} data-testid="event-sign-in">
              {es.community.events.signInCta}
            </Link>
          </Button>
        </div>
      )}

      {moderates ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" asChild>
            <Link
              href={`/grupos/${event.group.slug}/eventos/${event.id}/editar`}
              data-testid="event-edit"
            >
              {es.community.events.form.editTitle}
            </Link>
          </Button>
          <ThreadModActions
            threadId={event.threadId}
            pinned={event.threadPinned}
            locked={event.threadLocked}
          />
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold">
          {es.community.events.participantsTitle}
        </h2>
        {event.participants.length > 0 ? (
          <EventParticipants participants={event.participants} />
        ) : (
          <p
            className="text-muted-foreground text-sm"
            data-testid="event-participants-empty"
          >
            {es.community.events.participantsEmpty}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-semibold">
          {repliesLabel(posts.length)}
        </h2>

        {posts.length > 0 ? (
          <ol className="flex flex-col gap-4">
            {posts.map((post) => (
              <li
                key={post.id}
                id={post.id}
                className="border-border bg-card flex scroll-mt-24 flex-col gap-3 rounded-2xl border p-4"
                data-testid="event-post"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {post.author.username ? (
                      <Link
                        href={`/@${post.author.username}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {post.author.name}
                      </Link>
                    ) : (
                      post.author.name
                    )}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {whenLabel(post.createdAt)}
                  </span>
                </div>

                {post.body ? (
                  <p className="text-sm whitespace-pre-line">{post.body}</p>
                ) : null}

                <ThreadPhotos photos={post.photos} />
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        {event.threadLocked ? (
          <p
            className="border-border bg-muted/40 rounded-2xl border p-4 text-sm"
            data-testid="event-locked-note"
          >
            {es.community.lockedNote}
          </p>
        ) : user && event.viewerRole ? (
          <ReplyForm threadId={event.threadId} />
        ) : null}
      </section>
    </div>
  );
}
