"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { group, post, thread } from "@/db/community-schema";
import { image } from "@/db/media-schema";
import { project } from "@/db/project-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import type { CommunityActionResult } from "./actions";
import { findMembership } from "./membership";
import {
  canCreateThreadType,
  canMarkSolution,
  canModerate,
  postFormSchema,
  solutionSchema,
  threadFlagSchema,
  threadFormSchema,
  type PostFormValues,
  type ThreadFormValues,
} from "./schemas";

/**
 * Acciones de hilos y respuestas (spec §5.9 y §9). Igual que en los grupos
 * (D-054), el `user_id` sale de la sesión y los permisos se releen en cada
 * llamada: para escribir en un grupo hay que integrarlo (D-055).
 */

export type CreateThreadResult =
  { ok: true; id: string } | { ok: false; error: string };

/** Las fotos adjuntas tienen que ser de quien publica. */
async function imagesBelongToUser(
  imageIds: string[],
  userId: string,
): Promise<boolean> {
  const unique = [...new Set(imageIds)];
  if (unique.length === 0) {
    return true;
  }
  const rows = await getDb()
    .select({ id: image.id })
    .from(image)
    .where(and(inArray(image.id, unique), eq(image.ownerId, userId)));
  return rows.length === unique.length;
}

/** Abre un hilo en un grupo del que ya se es parte. */
export async function createThread(
  values: ThreadFormValues,
): Promise<CreateThreadResult> {
  const user = await requireUser();
  const parsed = threadFormSchema.safeParse(values);
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
  if (membership?.status !== "activo") {
    return { ok: false, error: es.community.errors.notMember };
  }
  if (!canCreateThreadType(membership.role, parsed.data.type)) {
    return { ok: false, error: es.community.errors.announcementOnly };
  }

  if (parsed.data.projectId !== undefined) {
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
      return { ok: false, error: es.community.errors.projectNotOwn };
    }
  }

  if (!(await imagesBelongToUser(parsed.data.imageIds, user.id))) {
    return { ok: false, error: es.community.errors.generic };
  }

  const [created] = await db
    .insert(thread)
    .values({
      groupId: found.id,
      authorId: user.id,
      type: parsed.data.type,
      title: parsed.data.title,
      body: parsed.data.body,
      imageIds: parsed.data.imageIds,
      projectId: parsed.data.projectId ?? null,
    })
    .returning({ id: thread.id });

  return { ok: true, id: created.id };
}

/** Responde en un hilo abierto de un grupo del que ya se es parte. */
export async function createPost(
  values: PostFormValues,
): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = postFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? es.community.errors.generic,
    };
  }

  const db = getDb();
  const [found] = await db
    .select({
      id: thread.id,
      groupId: thread.groupId,
      locked: thread.locked,
    })
    .from(thread)
    .where(eq(thread.id, parsed.data.threadId))
    .limit(1);
  if (!found) {
    return { ok: false, error: es.community.threadNotFound };
  }
  if (found.locked) {
    return { ok: false, error: es.community.errors.locked };
  }

  const membership = await findMembership(found.groupId, user.id);
  if (membership?.status !== "activo") {
    return { ok: false, error: es.community.errors.notMember };
  }

  if (!(await imagesBelongToUser(parsed.data.imageIds, user.id))) {
    return { ok: false, error: es.community.errors.generic };
  }

  await db.insert(post).values({
    threadId: found.id,
    authorId: user.id,
    body: parsed.data.body,
    imageIds: parsed.data.imageIds,
  });
  await db
    .update(thread)
    .set({ lastActivityAt: new Date() })
    .where(eq(thread.id, found.id));

  return { ok: true };
}

/**
 * Marca (o desmarca) una respuesta como solución: puede quien abrió la
 * pregunta o la moderación del grupo, y solo en preguntas (D-055).
 */
export async function markSolution(input: {
  threadId: string;
  postId: string;
}): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = solutionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.community.errors.generic };
  }

  const db = getDb();
  const [found] = await db
    .select({
      id: thread.id,
      type: thread.type,
      authorId: thread.authorId,
      groupId: thread.groupId,
      solutionPostId: thread.solutionPostId,
    })
    .from(thread)
    .where(eq(thread.id, parsed.data.threadId))
    .limit(1);
  if (!found) {
    return { ok: false, error: es.community.threadNotFound };
  }

  const membership = await findMembership(found.groupId, user.id);
  const canMark =
    found.type === "pregunta" &&
    canMarkSolution({
      viewerRole: membership?.status === "activo" ? membership.role : null,
      isAuthor: found.authorId === user.id,
    });
  if (!canMark) {
    return { ok: false, error: es.community.errors.notAllowed };
  }

  const [postRow] = await db
    .select({ id: post.id })
    .from(post)
    .where(and(eq(post.id, parsed.data.postId), eq(post.threadId, found.id)))
    .limit(1);
  if (!postRow) {
    return { ok: false, error: es.community.errors.notFound };
  }

  const next = found.solutionPostId === postRow.id ? null : postRow.id;
  await db
    .update(thread)
    .set({ solutionPostId: next })
    .where(eq(thread.id, found.id));

  return { ok: true };
}

/** Fija o cierra un hilo (y lo reabre): solo la moderación del grupo. */
export async function setThreadFlag(input: {
  threadId: string;
  flag: "pinned" | "locked";
  value: boolean;
}): Promise<CommunityActionResult> {
  const user = await requireUser();
  const parsed = threadFlagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.community.errors.generic };
  }

  const db = getDb();
  const [found] = await db
    .select({ id: thread.id, groupId: thread.groupId })
    .from(thread)
    .where(eq(thread.id, parsed.data.threadId))
    .limit(1);
  if (!found) {
    return { ok: false, error: es.community.threadNotFound };
  }

  const membership = await findMembership(found.groupId, user.id);
  if (membership?.status !== "activo" || !canModerate(membership.role)) {
    return { ok: false, error: es.community.errors.notAllowed };
  }

  await db
    .update(thread)
    .set(
      parsed.data.flag === "pinned"
        ? { pinned: parsed.data.value }
        : { locked: parsed.data.value },
    )
    .where(eq(thread.id, found.id));

  return { ok: true };
}
