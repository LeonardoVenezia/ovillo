import type {
  GroupCategory,
  JoinPolicy,
  ThreadType,
} from "@/db/community-schema";
import { es } from "@/messages/es";

/** Etiquetas legibles de los grupos y los hilos (spec §5.9). */

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
