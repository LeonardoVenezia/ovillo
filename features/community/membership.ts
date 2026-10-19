import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { groupMember } from "@/db/community-schema";

/**
 * Membresía de una persona en un grupo, o `null` si no hay fila. La usan las
 * acciones de grupos y de hilos: los permisos se releen en cada llamada
 * (spec §9; D-054), nunca se confía en lo que manda el cliente.
 */
export async function findMembership(groupId: string, userId: string) {
  const [membership] = await getDb()
    .select({ role: groupMember.role, status: groupMember.status })
    .from(groupMember)
    .where(
      and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)),
    )
    .limit(1);
  return membership ?? null;
}
