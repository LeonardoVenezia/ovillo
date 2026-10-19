import type {
  EventCraft,
  GroupCategory,
  JoinPolicy,
  ThreadType,
} from "@/db/community-schema";
import { es } from "@/messages/es";

import type { EventStatus } from "./schemas";

/** Etiquetas legibles de los grupos, los hilos y los KAL/CAL (spec §5.9–5.10). */

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function categoryLabel(category: GroupCategory): string {
  return es.community.categories[category];
}

export function joinPolicyLabel(policy: JoinPolicy): string {
  return es.community.joinPolicies[policy];
}

export function membersLabel(count: number): string {
  return count === 1
    ? es.community.membersCountOne
    : es.community.membersCount.replace("{count}", String(count));
}

export function threadTypeLabel(type: ThreadType): string {
  return es.community.threadTypes[type];
}

export function repliesLabel(count: number): string {
  if (count === 0) {
    return es.community.noReplies;
  }
  return count === 1
    ? es.community.repliesCountOne
    : es.community.repliesCount.replace("{count}", String(count));
}

/** Fecha corta de un hilo: recién, hace 5 min, hace 2 h, ayer, 19 oct 2026. */
export function whenLabel(value: Date, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - value.getTime()) / 60_000);
  if (minutes < 1) {
    return es.community.when.justNow;
  }
  if (minutes < 60) {
    return es.community.when.minutes.replace("{count}", String(minutes));
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return es.community.when.hours.replace("{count}", String(hours));
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return es.community.when.yesterday;
  }
  if (days < 30) {
    return es.community.when.days.replace("{count}", String(days));
  }
  return dateFormatter.format(value);
}

const dayMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "Del 5 al 25 de octubre de 2026": el rango lindo de un KAL/CAL. */
export function eventDatesLabel(startsAt: string, endsAt: string): string {
  const start = new Date(`${startsAt}T00:00:00Z`);
  const end = new Date(`${endsAt}T00:00:00Z`);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return es.community.events.datesRange
      .replace("{from}", String(start.getUTCDate()))
      .replace("{to}", fullDateFormatter.format(end));
  }
  if (sameYear) {
    return es.community.events.datesRange
      .replace("{from}", dayMonthFormatter.format(start))
      .replace("{to}", fullDateFormatter.format(end));
  }
  return es.community.events.datesRange
    .replace("{from}", fullDateFormatter.format(start))
    .replace("{to}", fullDateFormatter.format(end));
}

/** KAL o CAL, según la técnica del evento. */
export function eventCraftLabel(craft: EventCraft): string {
  return es.community.events.crafts[craft];
}

export function eventStatusLabel(status: EventStatus): string {
  return es.community.events.statuses[status];
}

/** "Etapa 2" para la línea de tiempo del evento. */
export function eventStageLabel(index: number): string {
  return es.community.events.stageLabel.replace("{n}", String(index + 1));
}

export function eventParticipantsLabel(count: number): string {
  return count === 1
    ? es.community.events.participantsOne
    : es.community.events.participantsCount.replace("{count}", String(count));
}

/** "0 de 3 terminaron" (los terminados salen del proyecto de cada quien). */
export function eventFinishedLabel(finished: number, total: number): string {
  return es.community.events.finishedLabel
    .replace("{finished}", String(finished))
    .replace("{total}", String(total));
}
