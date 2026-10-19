import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReplyForm } from "@/features/community/components/reply-form";
import { SolutionButton } from "@/features/community/components/solution-button";
import { ThreadModActions } from "@/features/community/components/thread-mod-actions";
import { ThreadPhotos } from "@/features/community/components/thread-photos";
import { ThreadProjectCard } from "@/features/community/components/thread-project-card";
import {
  repliesLabel,
  threadTypeLabel,
  whenLabel,
} from "@/features/community/format";
import { canMarkSolution, canModerate } from "@/features/community/schemas";
import { getThreadById, listPosts } from "@/features/community/thread-queries";
import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Ficha de un hilo (spec §5.9, `/grupos/slug/hilos/id`): el hilo, sus
 * respuestas y lo que puede hacer quien mira. El proxy ya chequeó que el
 * grupo y el hilo existan (404 reales, D-023); acá se lee al momento porque
 * el estado cambia con cada respuesta (D-054). Solo escribe quien integra el
 * grupo (D-055) y, si el hilo está cerrado, no se aceptan respuestas.
 */

type Props = PageProps<"/grupos/[slug]/hilos/[id]">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThreadById(id);
  return thread ? { title: thread.title } : {};
}

export default async function ThreadPage({ params }: Props) {
  const { slug, id } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ThreadView slug={slug} id={id} />
      </Suspense>
    </section>
  );
}

async function ThreadView({ slug, id }: { slug: string; id: string }) {
  const user = await getOptionalUser();
  const thread = await getThreadById(id, user?.id);
  if (!thread || thread.group.slug !== slug) {
    notFound();
  }

  const posts = await listPosts(id);
  const moderates = canModerate(thread.viewerRole);
  const canMark =
    thread.type === "pregunta" &&
    canMarkSolution({
      viewerRole: thread.viewerRole,
      isAuthor: thread.isAuthor,
    });
  const signInHref = `/ingresar?volver=${encodeURIComponent(
    `/grupos/${thread.group.slug}/hilos/${thread.id}`,
  )}`;

  return (
    <div className="flex flex-col gap-6" data-testid="thread-view">
      <Link
        href={`/grupos/${thread.group.slug}`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        ← {thread.group.name}
      </Link>

      <article className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={thread.type === "anuncio" ? "default" : "secondary"}
            >
              {threadTypeLabel(thread.type)}
            </Badge>
            {thread.solutionPostId !== null ? (
              <Badge variant="outline">{es.community.solvedBadge}</Badge>
            ) : null}
            {thread.pinned ? (
              <Badge variant="outline">{es.community.pinnedBadge}</Badge>
            ) : null}
            {thread.locked ? (
              <Badge variant="outline">{es.community.lockedBadge}</Badge>
            ) : null}
          </div>

          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {thread.title}
          </h1>

          <p className="text-muted-foreground text-sm">
            {thread.author.username ? (
              <Link
                href={`/@${thread.author.username}`}
                className="underline-offset-4 hover:underline"
              >
                {thread.author.name}
              </Link>
            ) : (
              thread.author.name
            )}{" "}
            · {whenLabel(thread.createdAt)} ·{" "}
            <Link
              href={`/grupos/${thread.group.slug}`}
              className="underline-offset-4 hover:underline"
            >
              {thread.group.name}
            </Link>
          </p>
        </div>

        {thread.body ? (
          <p className="text-sm whitespace-pre-line">{thread.body}</p>
        ) : null}

        <ThreadPhotos photos={thread.photos} />
        {thread.project ? <ThreadProjectCard project={thread.project} /> : null}

        {moderates ? (
          <ThreadModActions
            threadId={thread.id}
            pinned={thread.pinned}
            locked={thread.locked}
          />
        ) : null}
      </article>

      <section className="flex flex-col gap-4" data-testid="thread-replies">
        <h2 className="font-heading text-xl font-semibold">
          {repliesLabel(posts.length)}
        </h2>

        {posts.length > 0 ? (
          <ol className="flex flex-col gap-4">
            {posts.map((post) => {
              const isSolution = thread.solutionPostId === post.id;
              return (
                <li
                  key={post.id}
                  id={post.id}
                  className="border-border bg-card flex scroll-mt-24 flex-col gap-3 rounded-2xl border p-4"
                  data-testid="thread-post"
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
                    {isSolution ? (
                      <Badge>{es.community.solutionBadge}</Badge>
                    ) : null}
                  </div>

                  {post.body ? (
                    <p className="text-sm whitespace-pre-line">{post.body}</p>
                  ) : null}

                  <ThreadPhotos photos={post.photos} />

                  {canMark ? (
                    <div>
                      <SolutionButton
                        threadId={thread.id}
                        postId={post.id}
                        solved={isSolution}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>

      <section className="flex flex-col gap-3" data-testid="thread-reply">
        {thread.locked ? (
          <p
            className="border-border bg-muted/40 rounded-2xl border p-4 text-sm"
            data-testid="thread-locked-note"
          >
            {es.community.lockedNote}
          </p>
        ) : user && thread.viewerRole ? (
          <ReplyForm threadId={thread.id} />
        ) : user ? (
          <div className="border-border bg-card flex flex-col items-start gap-2 rounded-2xl border p-4">
            <p className="text-sm">{es.community.membersOnlyWrite}</p>
            {thread.viewerPending ? (
              <p className="text-muted-foreground text-sm">
                {es.community.pendingHint}
              </p>
            ) : null}
            <Button size="sm" variant="outline" asChild>
              <Link
                href={`/grupos/${thread.group.slug}`}
                data-testid="thread-go-group"
              >
                {thread.group.name}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="border-border bg-card flex flex-col items-start gap-3 rounded-2xl border p-4">
            <Button asChild>
              <Link href={signInHref} data-testid="thread-sign-in">
                {es.community.replySignInCta}
              </Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
