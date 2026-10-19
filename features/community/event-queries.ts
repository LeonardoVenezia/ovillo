import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { io } from "next/cache";

import { getDb } from "@/db";
import { user } from "@/db/auth-schema";
import {
  event,
  eventParticipant,
  group,
  groupMember,
  thread,
  type EventCraft,
  type EventStage,
  type GroupMemberStatus,
  type GroupRole,
} from "@/db/community-schema";
import { image } from "@/db/media-schema";
import { pattern } from "@/db/pattern-schema";
import { project } from "@/db/project-schema";
import { toPhotoView, type PhotoView } from "@/features/projects/media-view";
import { normalizeText } from "@/lib/slug";

import { eventStatus, todayIso, type EventStatus } from "./schemas";

/**
 * Lecturas de los KAL/CAL (spec §5.10, tramo 3 de la Fase 6).
 *
 * Igual que los hilos (D-055), se leen al momento, sin caché: la ficha
 * necesita el estado de quien mira (su membresía y su proyecto) y la lista
 * cambia con cada participante. Las páginas las dejan detrás de un
 * `<Suspense>`.
 */

/**
 * La fecha de hoy, leída al momento del request: `io()` la mantiene fuera
 * del caparazón estático (Cache Components) y el estado del KAL/CAL se
 * deriva siempre con la fecha real.
 */
async function currentDay(): Promise<string> {
  await io();
  return todayIso();
}

export type EventCard = {
  id: string;
  name: string;
  craft: EventCraft;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  group: { slug: string; name: string };
  /** Participantes y cuántos ya terminaron (según el estado del proyecto). */
  participants: number;
  finished: number;
  organizerName: string;
  organizerUsername: string | null;
};

const participantCountSql = sql<number>`(
  select count(*) from ${eventParticipant}
  where ${eventParticipant.eventId} = ${event.id}
)`;

const finishedCountSql = sql<number>`(
  select count(*) from ${eventParticipant}
  inner join ${project} on ${project.id} = ${eventParticipant.projectId}
  where ${eventParticipant.eventId} = ${event.id}
    and ${project.status} = 'terminado'
    and ${project.deletedAt} is null
)`;

const eventCardSelect = {
  id: event.id,
  name: event.name,
  craft: event.craft,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  groupSlug: group.slug,
  groupName: group.name,
  participants: participantCountSql,
  finished: finishedCountSql,
  organizerName: user.name,
  organizerUsername: user.username,
};

type EventCardRow = {
  id: string;
  name: string;
  craft: EventCraft;
  startsAt: string;
  endsAt: string;
  groupSlug: string;
  groupName: string;
  participants: number;
  finished: number;
  organizerName: string;
  organizerUsername: string | null;
};

function toEventCard(row: EventCardRow, today: string): EventCard {
  return {
    id: row.id,
    name: row.name,
    craft: row.craft,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: eventStatus(row.startsAt, row.endsAt, today),
    group: { slug: row.groupSlug, name: row.groupName },
    participants: row.participants,
    finished: row.finished,
    organizerName: row.organizerName,
    organizerUsername: row.organizerUsername,
  };
}

const STATUS_ORDER: Record<EventStatus, number> = {
  "en-curso": 0,
  proximo: 1,
  terminado: 2,
};

/**
 * Todos los KAL/CAL de un grupo (o de toda la comunidad): primero los que
 * están en curso, después los próximos y al final los terminados (del más
 * reciente al más viejo).
 */
export async function listEvents(
  filters: { groupId?: string } = {},
): Promise<EventCard[]> {
  const today = await currentDay();
  const rows = await getDb()
    .select(eventCardSelect)
    .from(event)
    .innerJoin(group, eq(event.groupId, group.id))
    .innerJoin(user, eq(event.createdBy, user.id))
    .where(filters.groupId ? eq(event.groupId, filters.groupId) : undefined);

  return rows
    .map((row) => toEventCard(row, today))
    .sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) {
        return byStatus;
      }
      return a.status === "terminado"
        ? b.endsAt.localeCompare(a.endsAt)
        : a.startsAt.localeCompare(b.startsAt);
    });
}

/** KAL/CAL activos (en curso o por empezar) para el hub de comunidad. */
export async function listActiveEvents(limit = 4): Promise<EventCard[]> {
  const today = await currentDay();
  const rows = await getDb()
    .select(eventCardSelect)
    .from(event)
    .innerJoin(group, eq(event.groupId, group.id))
    .innerJoin(user, eq(event.createdBy, user.id))
    .where(sql`${event.endsAt} >= ${today}`)
    .orderBy(asc(event.startsAt))
    .limit(limit);

  return rows.map((row) => toEventCard(row, today));
}

export type EventPatternView = {
  id: string;
  slug: string;
  name: string;
  craft: string | null;
};

export type EventParticipantView = {
  userId: string;
  name: string;
  username: string | null;
  image: string | null;
  joinedAt: Date;
  /** El proyecto vinculado ya está terminado (o frogueado: no suma). */
  finished: boolean;
  /**
   * Proyecto de la persona; `null` cuando es privado y quien mira no es su
   * dueña (misma vara que el perfil, D-042): se muestra "Proyecto privado".
   */
  project: { name: string; slug: string; cover: PhotoView | null } | null;
};

export type EventDetail = {
  id: string;
  name: string;
  craft: EventCraft;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  /** La descripción vive en el cuerpo del hilo propio del evento. */
  description: string;
  threadId: string;
  threadLocked: boolean;
  threadPinned: boolean;
  stages: EventStage[];
  patterns: EventPatternView[];
  group: { id: string; slug: string; name: string };
  organizer: { name: string; username: string | null };
  viewerRole: GroupRole | null;
  viewerPending: boolean;
  /** Proyecto con el que ya se sumó quien mira, si se sumó. */
  viewerProjectId: string | null;
  participants: EventParticipantView[];
  finished: number;
};

const viewerMember = alias(groupMember, "event_viewer_member");

type EventDetailRow = {
  id: string;
  name: string;
  craft: EventCraft;
  startsAt: string;
  endsAt: string;
  patternIds: string[];
  stages: EventStage[];
  description: string;
  threadId: string;
  threadLocked: boolean;
  threadPinned: boolean;
  groupId: string;
  groupSlug: string;
  groupName: string;
  organizerName: string;
  organizerUsername: string | null;
  viewerRole: GroupRole | null;
  viewerStatus: GroupMemberStatus | null;
};

/** Ficha completa de un KAL/CAL (`/grupos/slug/eventos/id`). */
export async function getEventById(
  id: string,
  viewerId?: string,
): Promise<EventDetail | null> {
  const [row] = await getDb()
    .select({
      id: event.id,
      name: event.name,
      craft: event.craft,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      patternIds: event.patternIds,
      stages: event.stages,
      description: thread.body,
      threadId: event.threadId,
      threadLocked: thread.locked,
      threadPinned: thread.pinned,
      groupId: group.id,
      groupSlug: group.slug,
      groupName: group.name,
      organizerName: user.name,
      organizerUsername: user.username,
      viewerRole: viewerMember.role,
      viewerStatus: viewerMember.status,
    })
    .from(event)
    .innerJoin(group, eq(event.groupId, group.id))
    .innerJoin(thread, eq(event.threadId, thread.id))
    .innerJoin(user, eq(event.createdBy, user.id))
    .leftJoin(
      viewerMember,
      and(
        eq(viewerMember.groupId, event.groupId),
        eq(viewerMember.userId, viewerId ?? ""),
      ),
    )
    .where(eq(event.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const detail = row as EventDetailRow;
  const today = await currentDay();
  const [patterns, participantList] = await Promise.all([
    listEventPatterns(detail.patternIds),
    listEventParticipants(detail.id, viewerId),
  ]);
  const participants = participantList.participants;

  return {
    id: detail.id,
    name: detail.name,
    craft: detail.craft,
    startsAt: detail.startsAt,
    endsAt: detail.endsAt,
    status: eventStatus(detail.startsAt, detail.endsAt, today),
    description: detail.description,
    threadId: detail.threadId,
    threadLocked: detail.threadLocked,
    threadPinned: detail.threadPinned,
    stages: detail.stages,
    patterns,
    group: {
      id: detail.groupId,
      slug: detail.groupSlug,
      name: detail.groupName,
    },
    organizer: {
      name: detail.organizerName,
      username: detail.organizerUsername,
    },
    viewerRole: detail.viewerStatus === "activo" ? detail.viewerRole : null,
    viewerPending: detail.viewerStatus === "pendiente",
    viewerProjectId: participantList.viewerProjectId,
    participants,
    finished: participants.filter((item) => item.finished).length,
  };
}

async function listEventPatterns(
  patternIds: string[],
): Promise<EventPatternView[]> {
  if (patternIds.length === 0) {
    return [];
  }
  const rows = await getDb()
    .select({
      id: pattern.id,
      slug: pattern.slug,
      name: pattern.name,
      craft: pattern.craft,
    })
    .from(pattern)
    .where(inArray(pattern.id, patternIds));

  const byId = new Map(rows.map((row) => [row.id, row]));
  return patternIds.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

/** Participantes con su proyecto (respetando la privacidad, D-042). */
async function listEventParticipants(
  eventId: string,
  viewerId?: string,
): Promise<{
  participants: EventParticipantView[];
  viewerProjectId: string | null;
}> {
  const rows = await getDb()
    .select({
      userId: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      joinedAt: eventParticipant.createdAt,
      projectId: project.id,
      projectName: project.name,
      projectSlug: project.slug,
      projectStatus: project.status,
      projectOwnerId: project.userId,
      projectVisibility: project.visibility,
      cover: image,
    })
    .from(eventParticipant)
    .innerJoin(user, eq(eventParticipant.userId, user.id))
    .innerJoin(project, eq(eventParticipant.projectId, project.id))
    .leftJoin(image, eq(project.coverImageId, image.id))
    .where(eq(eventParticipant.eventId, eventId))
    .orderBy(asc(eventParticipant.createdAt));

  const participants = rows.map((row) => {
    const visible =
      row.projectVisibility === "publico" || row.projectOwnerId === viewerId;
    return {
      userId: row.userId,
      name: row.name,
      username: row.username,
      image: row.image,
      joinedAt: row.joinedAt,
      finished: row.projectStatus === "terminado",
      project: visible
        ? {
            name: row.projectName,
            slug: row.projectSlug,
            cover: row.cover ? toPhotoView(row.cover) : null,
          }
        : null,
    };
  });

  const own = viewerId
    ? rows.find((row) => row.userId === viewerId)
    : undefined;

  return { participants, viewerProjectId: own?.projectId ?? null };
}

export type ProjectOption = {
  id: string;
  name: string;
  status: string;
};

/** Proyectos propios vivos, para elegir con cuál sumarse al evento. */
export async function listOwnProjectOptions(
  userId: string,
): Promise<ProjectOption[]> {
  const rows = await getDb()
    .select({ id: project.id, name: project.name, status: project.status })
    .from(project)
    .where(and(eq(project.userId, userId), isNull(project.deletedAt)));

  return rows.sort((a, b) =>
    normalizeText(a.name).localeCompare(normalizeText(b.name), "es"),
  );
}

/** Patrones de la biblioteca para el formulario del evento (con filtro). */
export async function listEventPatternOptions(): Promise<EventPatternView[]> {
  const rows = await getDb()
    .select({
      id: pattern.id,
      slug: pattern.slug,
      name: pattern.name,
      craft: pattern.craft,
    })
    .from(pattern)
    .orderBy(asc(pattern.name))
    .limit(300);

  return rows;
}
