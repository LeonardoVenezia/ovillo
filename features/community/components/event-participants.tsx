import { Sparkles } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { es } from "@/messages/es";

import type { EventParticipantView } from "../event-queries";

/**
 * Galería de participantes del KAL/CAL (spec §5.10): cada quien con su
 * proyecto. Los proyectos privados solo asoman a su dueña (D-042): para el
 * resto se muestra "Proyecto privado" sin enlace. Quien terminó lleva su
 * distintivo.
 */
export function EventParticipants({
  participants,
}: {
  participants: EventParticipantView[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="event-participants">
      {participants.map((participant) => (
        <li
          key={participant.userId}
          data-testid="event-participant"
          className="border-border bg-card flex items-center gap-3 rounded-2xl border p-3"
        >
          <Avatar>
            {participant.image ? (
              <AvatarImage src={participant.image} alt="" />
            ) : null}
            <AvatarFallback>
              {participant.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <span className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">
                {participant.username ? (
                  <Link
                    href={`/@${participant.username}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {participant.name}
                  </Link>
                ) : (
                  participant.name
                )}
              </span>
              {participant.finished ? (
                <Badge className="gap-1" data-testid="event-finished-badge">
                  <Sparkles className="size-3" aria-hidden />
                  {es.community.events.finishedBadge}
                </Badge>
              ) : null}
            </span>

            {participant.project ? (
              <Link
                href={`/@${participant.username}/proyectos/${participant.project.slug}`}
                className="text-muted-foreground truncate text-xs underline-offset-4 hover:underline"
                data-testid="event-participant-project"
              >
                {participant.project.name}
              </Link>
            ) : (
              <span
                className="text-muted-foreground truncate text-xs"
                data-testid="event-participant-private"
              >
                {es.community.events.projectPrivate}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
