"use server";

import { and, count, eq, like, or } from "drizzle-orm";

import { getDb } from "@/db";
import {
  GROUP_LIMIT,
  group,
  groupMember,
  type GroupMemberStatus,
} from "@/db/community-schema";
import { firstFreeSlug } from "@/lib/slug";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import {
  canModerate,
  groupFormSchema,
  groupSlug,
  groupUpdateSchema,
  isGroupOwner,
  memberActionSchema,
  memberRoleSchema,
  type GroupFormValues,
  type GroupUpdateInput,
} from "./schemas";

/**
 * Acciones de la comunidad (spec §5.9 y §9: Zod + autorización en cada
 * mutación). El `user_id` sale de la sesión, nunca del cliente, y los
 * permisos se releen de la membresía en cada llamada.
 *
 * Al crear un grupo, quien lo hace queda como dueña/o activo; el slug se
 * calcula una vez y no cambia al renombrar (la URL `/grupos/slug` es estable).
 */

export type CommunityActionResult = { ok: true } | { ok: false; error: string };

export type CreateGroupResult =
  { ok: true; slug: string } | { ok: false; error: string };

export type JoinGroupResult =
  { ok: true; status: GroupMemberStatus } | { ok: false; error: string };

/** Membresía de una persona en un grupo, o `null` si no hay fila. */
async function findMembership(groupId: string, userId: string) {
  const [membership] = await getDb()
    .select({ role: groupMember.role, status: groupMember.status })
    .from(groupMember)
    .where(
      and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)),
    )
    .limit(1);
  return membership ?? null;
}

/** Crea un grupo y deja a quien lo llama como dueña/o. */
export async function createGroup(
  values: GroupFormValues,
): Promise<CreateGroupResult> {
  const user = await requireUser();
  const parsed = groupFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.community.errors.generic,
    };
  }

  const db = getDb();

  const [owned] = await db
    .select({ value: count() })
    .from(group)
    .where(eq(group.createdBy, user.id));
  if ((owned?.value ?? 0) >= GROUP_LIMIT) {
    return { ok: false, error: es.community.errors.limit };
  }

  const base = groupSlug(parsed.data.name);
  const taken = await db
    .select({ slug: group.slug })
    .from(group)
    .where(or(eq(group.slug, base), like(group.slug, `${base}-%`)));
  const slug = firstFreeSlug(
    base,
    taken.map((row) => row.slug),
  );

  try {
    const [created] = await db
      .insert(group)
      .values({
        slug,
        name: parsed.data.name,
        description: parsed.data.description,
        rules: parsed.data.rules,
        category: parsed.data.category,
        joinPolicy: parsed.data.joinPolicy,
        createdBy: user.id,
      })
      .returning({ id: group.id });
    await db.insert(groupMember).values({
      groupId: created.id,
      userId: user.id,
      role: "dueno",
      status: "activo",
    });
  } catch {
    // Dos grupos con el mismo nombre a la vez: la unique del slug frena al segundo.
    return { ok: false, error: es.community.errors.generic };
  }

  return { ok: true, slug };
}

/** Edita un grupo: solo quien lo creó o sus moderadores. */
export async function updateGroup(
  input: GroupUpdateInput,
): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = groupUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.community.errors.generic,
    };
  }

  const db = getDb();
  const [found] = await db
    .select({ id: group.id })
    .from(group)
    .where(eq(group.id, parsed.data.groupId))
    .limit(1);
  if (!found) {
    return { ok: false, error: es.community.errors.notFound };
  }

  const membership = await findMembership(found.id, user.id);
  if (!canModerate(membership?.role ?? null)) {
    return { ok: false, error: es.community.errors.notAllowed };
  }

  await db
    .update(group)
    .set({
      name: parsed.data.values.name,
      description: parsed.data.values.description,
      rules: parsed.data.values.rules,
      category: parsed.data.values.category,
      joinPolicy: parsed.data.values.joinPolicy,
    })
    .where(eq(group.id, found.id));

  return { ok: true };
}

/**
 * Unirse a un grupo. Idempotente: si ya hay membresía o solicitud, devuelve
 * el estado real. Con `abierto` entra `activo`; con `aprobacion` queda
 * `pendiente`.
 */
export async function joinGroup(groupId: string): Promise<JoinGroupResult> {
  const user = await requireUser();

  const db = getDb();
  const [found] = await db
    .select({ id: group.id, joinPolicy: group.joinPolicy })
    .from(group)
    .where(eq(group.id, groupId))
    .limit(1);
  if (!found) {
    return { ok: false, error: es.community.errors.notFound };
  }

  const existing = await findMembership(found.id, user.id);
  if (existing) {
    return { ok: true, status: existing.status };
  }

  const status: GroupMemberStatus =
    found.joinPolicy === "abierto" ? "activo" : "pendiente";
  try {
    await db.insert(groupMember).values({
      groupId: found.id,
      userId: user.id,
      role: "miembro",
      status,
    });
  } catch {
    // Dos toques a la vez: la PK frena el segundo; devolvemos el estado real.
    const raced = await findMembership(found.id, user.id);
    return raced
      ? { ok: true, status: raced.status }
      : { ok: false, error: es.community.errors.generic };
  }

  return { ok: true, status };
}

/**
 * Salir del grupo (o cancelar una solicitud pendiente). Quien creó el grupo
 * no puede salir: transferencia llega con la moderación de la Fase 8 (D-054).
 */
export async function leaveGroup(
  groupId: string,
): Promise<CommunityActionResult> {
  const user = await requireUser();

  const membership = await findMembership(groupId, user.id);
  if (!membership) {
    return { ok: true };
  }
  if (isGroupOwner(membership.role)) {
    return { ok: false, error: es.community.errors.ownerCannotLeave };
  }

  await getDb()
    .delete(groupMember)
    .where(
      and(eq(groupMember.groupId, groupId), eq(groupMember.userId, user.id)),
    );
  return { ok: true };
}

/** Acepta una solicitud: solo dueña/o y moderadores. */
export async function approveMember(input: {
  groupId: string;
  userId: string;
}): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = memberActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.community.errors.generic };
  }

  const membership = await findMembership(parsed.data.groupId, user.id);
  if (!canModerate(membership?.role ?? null)) {
    return { ok: false, error: es.community.errors.notAllowed };
  }

  await getDb()
    .update(groupMember)
    .set({ status: "activo" })
    .where(
      and(
        eq(groupMember.groupId, parsed.data.groupId),
        eq(groupMember.userId, parsed.data.userId),
        eq(groupMember.status, "pendiente"),
      ),
    );
  return { ok: true };
}

/** Rechaza una solicitud (borra la fila pendiente). */
export async function rejectMember(input: {
  groupId: string;
  userId: string;
}): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = memberActionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.community.errors.generic };
  }

  const membership = await findMembership(parsed.data.groupId, user.id);
  if (!canModerate(membership?.role ?? null)) {
    return { ok: false, error: es.community.errors.notAllowed };
  }

  await getDb()
    .delete(groupMember)
    .where(
      and(
        eq(groupMember.groupId, parsed.data.groupId),
        eq(groupMember.userId, parsed.data.userId),
        eq(groupMember.status, "pendiente"),
      ),
    );
  return { ok: true };
}

/**
 * Nombra o quita moderador/a: solo quien creó el grupo. La condición del
 * `role` en el UPDATE limita las transiciones (nunca toca a la dueña/o).
 */
export async function setMemberRole(input: {
  groupId: string;
  userId: string;
  role: "moderador" | "miembro";
}): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = memberRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.community.errors.generic };
  }

  const membership = await findMembership(parsed.data.groupId, user.id);
  if (!isGroupOwner(membership?.role ?? null)) {
    return { ok: false, error: es.community.errors.notAllowed };
  }

  await getDb()
    .update(groupMember)
    .set({ role: parsed.data.role })
    .where(
      and(
        eq(groupMember.groupId, parsed.data.groupId),
        eq(groupMember.userId, parsed.data.userId),
        eq(groupMember.status, "activo"),
        eq(
          groupMember.role,
          parsed.data.role === "moderador" ? "miembro" : "moderador",
        ),
      ),
    );
  return { ok: true };
}
