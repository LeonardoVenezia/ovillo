"use server";

import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { event, eventParticipant, group, thread } from "@/db/community-schema";
import { project } from "@/db/project-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import type { CommunityActionResult } from "./actions";
import { findMembership } from "./membership";
import {
  canOrganizeEvent,
  eventCreateSchema,
  eventJoinSchema,
  eventLeaveSchema,
  eventUpdateSchema,
  type EventCreateInput,
  type EventUpdateInput,
} from "./schemas";

/**
 * Acciones de los KAL/CAL (spec §5.10 y §9). Igual que en los hilos (D-055),
 * el `user_id` sale de la sesión y los permisos se releen en cada llamada:
 * los eventos los organiza la moderación del grupo y se suma quien lo
 * integra, con un proyecto propio.
 *
 * El hilo del evento se crea acá mismo (título = nombre, cuerpo =
 * descripción) y se mantiene sincronizado al editar.
 */

export type CreateEventResult =
  { ok: true; id: string } | { ok: false; error: string };

/** Crea un KAL/CAL con su hilo propio; solo la moderación del grupo. */
export async function createEvent(
  input: EventCreateInput,
): Promise<CreateEventResult> {
  const user = await requireUser();
  const parsed = eventCreateSchema.safeParse(input);
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
  if (
    !canOrganizeEvent(membership?.status === "activo" ? membership.role : null)
  )
    return { ok: false, error: es.community.events.errors.notAllowed };

  const { values } = parsed.data;
  const [createdThread] = await db
    .insert(thread)
    .values({
      groupId: found.id,
      authorId: user.id,
      type: "charla",
      title: values.name,
      body: values.description,
    })
    .returning({ id: thread.id });

  const [created] = await db
    .insert(event)
    .values({
      groupId: found.id,
      threadId: createdThread.id,
      createdBy: user.id,
      name: values.name,
      craft: values.craft,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      patternIds: values.patternIds,
      stages: values.stages,
    })
    .returning({ id: event.id });

  return { ok: true, id: created.id };
}

/** Edita un KAL/CAL y su hilo (nombre y descripción); solo la moderación. */
export async function updateEvent(
  input: EventUpdateInput,
): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = eventUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.community.errors.generic,
    };
  }

  const db = getDb();
  const [found] = await db
    .select({
      id: event.id,
      groupId: event.groupId,
      threadId: event.threadId,
    })
    .from(event)
    .where(eq(event.id, parsed.data.eventId))
    .limit(1);
  if (!found) {
    return { ok: false, error: es.community.events.errors.notFound };
  }

  const membership = await findMembership(found.groupId, user.id);
  if (
    !canOrganizeEvent(membership?.status === "activo" ? membership.role : null)
  )
    return { ok: false, error: es.community.events.errors.notAllowed };

  const { values } = parsed.data;
  await db
    .update(thread)
    .set({ title: values.name, body: values.description })
    .where(eq(thread.id, found.threadId));
  await db
    .update(event)
    .set({
      name: values.name,
      craft: values.craft,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      patternIds: values.patternIds,
      stages: values.stages,
    })
    .where(eq(event.id, found.id));

  return { ok: true };
}

/**
 * Sumarse al KAL/CAL con un proyecto propio (o cambiar el proyecto, si ya
 * estaba sumada): idempotente, la PK compuesta resuelve el duplicado.
 */
export async function joinEvent(input: {
  eventId: string;
  projectId: string;
}): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = eventJoinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.community.errors.generic };
  }

  const db = getDb();
  const [found] = await db
    .select({ id: event.id, groupId: event.groupId })
    .from(event)
    .where(eq(event.id, parsed.data.eventId))
    .limit(1);
  if (!found) {
    return { ok: false, error: es.community.events.errors.notFound };
  }

  const membership = await findMembership(found.groupId, user.id);
  if (membership?.status !== "activo") {
    return { ok: false, error: es.community.events.errors.notMember };
  }

  const [ownProject] = await db
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.id, parsed.data.projectId),
        eq(project.userId, user.id),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);
  if (!ownProject) {
    return { ok: false, error: es.community.events.errors.projectNotOwn };
  }

  await db
    .insert(eventParticipant)
    .values({
      eventId: found.id,
      userId: user.id,
      projectId: ownProject.id,
    })
    .onConflictDoUpdate({
      target: [eventParticipant.eventId, eventParticipant.userId],
      set: { projectId: ownProject.id, updatedAt: new Date() },
    });

  return { ok: true };
}

/** Salirse del KAL/CAL (el proyecto queda como estaba). */
export async function leaveEvent(input: {
  eventId: string;
}): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = eventLeaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.community.errors.generic };
  }

  await getDb()
    .delete(eventParticipant)
    .where(
      and(
        eq(eventParticipant.eventId, parsed.data.eventId),
        eq(eventParticipant.userId, user.id),
      ),
    );
  return { ok: true };
}
