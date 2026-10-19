import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ThreadCard } from "@/features/community/components/thread-card";
import { getGroupBySlug } from "@/features/community/queries";
import { listThreads } from "@/features/community/thread-queries";
import { es } from "@/messages/es";

/**
 * Todos los hilos de un grupo (spec §5.9, `/grupos/slug/hilos`). Lectura
 * pública y al momento, como la ficha (D-054); los fijados van arriba.
 */

type Props = PageProps<"/grupos/[slug]/hilos">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  return group
    ? { title: `${group.name} · ${es.community.threadsAllTitle}` }
    : {};
}

export default async function GroupThreadsPage({ params }: Props) {
  const { slug } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ThreadsView slug={slug} />
      </Suspense>
    </section>
  );
}

async function ThreadsView({ slug }: { slug: string }) {
  const group = await getGroupBySlug(slug);
  if (!group) {
    notFound();
  }

  const threads = await listThreads({ groupId: group.id });

  return (
    <div className="flex flex-col gap-6" data-testid="group-threads">
      <div className="flex flex-col gap-1">
        <Link
          href={`/grupos/${group.slug}`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← {group.name}
        </Link>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.community.threadsAllTitle}
        </h1>
      </div>

      {threads.length > 0 ? (
        <div className="flex flex-col gap-3">
          {threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {es.community.threadsEmpty}
        </p>
      )}
    </div>
  );
}
