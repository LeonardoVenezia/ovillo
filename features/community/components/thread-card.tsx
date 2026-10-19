import { CheckCircle2, Lock, Pin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { es } from "@/messages/es";

import { repliesLabel, threadTypeLabel, whenLabel } from "../format";
import type { ThreadCard as ThreadCardData } from "../thread-queries";

/**
 * Tarjeta de hilo (spec §5.9): tipo, título, quién lo abrió, respuestas y
 * cuándo fue el último movimiento. Los fijados, cerrados y resueltos se
 * marcan; en las listas de la comunidad también se muestra el grupo.
 */
export function ThreadCard({
  thread,
  showGroup = false,
}: {
  thread: ThreadCardData;
  showGroup?: boolean;
}) {
  return (
    <Link
      href={`/grupos/${thread.group.slug}/hilos/${thread.id}`}
      data-testid="thread-card"
      className="border-border bg-card hover:bg-muted/40 focus-visible:outline-ring flex flex-col gap-2 rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant={thread.type === "anuncio" ? "default" : "secondary"}>
          {threadTypeLabel(thread.type)}
        </Badge>
        {thread.solved ? (
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="size-3" aria-hidden />
            {es.community.solvedBadge}
          </Badge>
        ) : null}
        {thread.pinned ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Pin className="size-3" aria-hidden />
            {es.community.pinnedBadge}
          </span>
        ) : null}
        {thread.locked ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Lock className="size-3" aria-hidden />
            {es.community.lockedBadge}
          </span>
        ) : null}
      </span>

      <span className="leading-snug font-medium">{thread.title}</span>

      <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span>{thread.authorName}</span>
        <span aria-hidden>·</span>
        <span>{repliesLabel(thread.replies)}</span>
        <span aria-hidden>·</span>
        <span>{whenLabel(thread.lastActivityAt)}</span>
        {showGroup ? (
          <>
            <span aria-hidden>·</span>
            <span>{thread.group.name}</span>
          </>
        ) : null}
      </span>
    </Link>
  );
}
