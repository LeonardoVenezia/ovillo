import { CalendarDays, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import {
  eventCraftLabel,
  eventDatesLabel,
  eventFinishedLabel,
  eventParticipantsLabel,
  eventStatusLabel,
} from "../format";
import type { EventCard as EventCardData } from "../event-queries";

/**
 * Tarjeta de un KAL/CAL (spec §5.10): técnica (KAL/CAL), estado, fechas y
 * cuánta gente participa y terminó. En el hub de comunidad también muestra
 * el grupo.
 */
export function EventCard({
  event,
  showGroup = false,
}: {
  event: EventCardData;
  showGroup?: boolean;
}) {
  return (
    <Link
      href={`/grupos/${event.group.slug}/eventos/${event.id}`}
      data-testid="event-card"
      className="border-border bg-card hover:bg-muted/40 focus-visible:outline-ring flex flex-col gap-2 rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant="secondary">{eventCraftLabel(event.craft)}</Badge>
        <Badge
          variant={event.status === "en-curso" ? "default" : "outline"}
          data-testid="event-status-badge"
        >
          {eventStatusLabel(event.status)}
        </Badge>
      </span>

      <span className="leading-snug font-medium">{event.name}</span>

      <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3" aria-hidden />
          {eventDatesLabel(event.startsAt, event.endsAt)}
        </span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" aria-hidden />
          {eventParticipantsLabel(event.participants)}
        </span>
        <span aria-hidden>·</span>
        <span data-testid="event-finished">
          {eventFinishedLabel(event.finished, event.participants)}
        </span>
        {showGroup ? (
          <>
            <span aria-hidden>·</span>
            <span>{event.group.name}</span>
          </>
        ) : null}
      </span>
    </Link>
  );
}
