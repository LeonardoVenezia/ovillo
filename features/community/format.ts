import type { GroupCategory, JoinPolicy } from "@/db/community-schema";
import { es } from "@/messages/es";

/** Etiquetas legibles de los grupos (spec §5.9). */

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
