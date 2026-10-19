import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db";
import { user } from "@/db/auth-schema";
import {
  group,
  groupMember,
  post,
  thread,
  type GroupMemberStatus,
  type GroupRole,
  type ThreadType,
} from "@/db/community-schema";
import { image } from "@/db/media-schema";
import { pattern } from "@/db/pattern-schema";
import type { ProfileVisibility } from "@/db/profile-schema";
import { project } from "@/db/project-schema";
import { toPhotoView, type PhotoView } from "@/features/projects/media-view";

/**
 * Lecturas de hilos y respuestas (spec §5.9, tramo 2 de la Fase 6).
 *
 * Igual que los grupos (D-054), los hilos se leen al momento, sin caché: la
 * lista cambia con cada respuesta y la ficha necesita el estado de quien mira
 * (su rol, si ya respondió). Las páginas las dejan detrás de un `<Suspense>`.
 */

/** Ficha resumida de un hilo: la usan las listas y las tarjetas. */
export type ThreadCard = {
  id: string;
  type: ThreadType;
  title: string;
  pinned: boolean;
  locked: boolean;
  /** `true` si la pregunta ya tiene respuesta solución marcada. */
  solved: boolean;
  replies: number;
  lastActivityAt: Date;
  authorName: string;
  authorUsername: string | null;
  group: { slug: string; name: string };
};

const replyCountSql = sql<number>`(
  select count(*) from ${post}
  where ${post.threadId} = ${thread.id}
)`;

const threadCardSelect = {
  id: thread.id,
  type: thread.type,
  title: thread.title,
  pinned: thread.pinned,
  locked: thread.locked,
  solutionPostId: thread.solutionPostId,
  lastActivityAt: thread.lastActivityAt,
  authorName: user.name,
  authorUsername: user.username,
  groupSlug: group.slug,
  groupName: group.name,
  replies: replyCountSql,
};

type ThreadCardRow = {
  id: string;
  type: ThreadType;
  title: string;
  pinned: boolean;
  locked: boolean;
  solutionPostId: string | null;
  lastActivityAt: Date;
  authorName: string;
  authorUsername: string | null;
  groupSlug: string;
  groupName: string;
  replies: number;
};

function toThreadCard(row: ThreadCardRow): ThreadCard {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    pinned: row.pinned,
    locked: row.locked,
    solved: row.solutionPostId !== null,
    replies: row.replies,
    lastActivityAt: row.lastActivityAt,
    authorName: row.authorName,
    authorUsername: row.authorUsername,
    group: { slug: row.groupSlug, name: row.groupName },
  };
}

export type ListThreadsFilters = {
  /** Limita a un grupo (ficha del grupo); sin él, toda la comunidad (hub). */
  groupId?: string;
  limit?: number;
};

/**
 * Hilos con actividad: los fijados primero y después por última actividad.
 */
export async function listThreads(
  filters: ListThreadsFilters = {},
): Promise<ThreadCard[]> {
  const query = getDb()
    .select(threadCardSelect)
    .from(thread)
    .innerJoin(group, eq(thread.groupId, group.id))
    .innerJoin(user, eq(thread.authorId, user.id))
    .where(filters.groupId ? eq(thread.groupId, filters.groupId) : undefined)
    .orderBy(desc(thread.pinned), desc(thread.lastActivityAt));

  const rows = filters.limit ? await query.limit(filters.limit) : await query;
  return rows.map(toThreadCard);
}

/** Preguntas que todavía no tienen ninguna respuesta (sección del hub). */
export async function listUnansweredQuestions(
  limit = 5,
): Promise<ThreadCard[]> {
  const rows = await getDb()
    .select(threadCardSelect)
    .from(thread)
    .innerJoin(group, eq(thread.groupId, group.id))
    .innerJoin(user, eq(thread.authorId, user.id))
    .where(and(eq(thread.type, "pregunta"), sql`${replyCountSql} = 0`))
    .orderBy(desc(thread.createdAt))
    .limit(limit);

  return rows.map(toThreadCard);
}

export type ThreadAuthor = {
  name: string;
  username: string | null;
  image: string | null;
};

export type ThreadProjectCard = {
  name: string;
  slug: string;
  username: string | null;
  cover: PhotoView | null;
  patternName: string | null;
  patternSlug: string | null;
};

export type ThreadDetail = {
  id: string;
  type: ThreadType;
  title: string;
  body: string;
  photos: PhotoView[];
  pinned: boolean;
  locked: boolean;
  solutionPostId: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  author: ThreadAuthor;
  group: { id: string; slug: string; name: string };
  /** Rol de quien mira si es parte activa del grupo; `null` si no. */
  viewerRole: GroupRole | null;
  /** Solicitud pendiente de quien mira. */
  viewerPending: boolean;
  isAuthor: boolean;
  /**
   * Tarjeta del proyecto que acompaña al hilo ("Pedir ayuda"). Los proyectos
   * privados solo asoman a su dueña (misma vara que el perfil, D-042).
   */
  project: ThreadProjectCard | null;
};

const viewerMember = alias(groupMember, "thread_viewer_member");
const projectUser = alias(user, "thread_project_user");

type ThreadDetailRow = {
  id: string;
  type: ThreadType;
  title: string;
  body: string;
  imageIds: string[];
  pinned: boolean;
  locked: boolean;
  solutionPostId: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  authorId: string;
  authorName: string;
  authorUsername: string | null;
  authorImage: string | null;
  groupId: string;
  groupSlug: string;
  groupName: string;
  viewerRole: GroupRole | null;
  viewerStatus: GroupMemberStatus | null;
  projectName: string | null;
  projectSlug: string | null;
  projectUsername: string | null;
  projectOwnerId: string | null;
  projectVisibility: ProfileVisibility | null;
  projectCover: typeof image.$inferSelect | null;
  patternName: string | null;
  patternSlug: string | null;
};

/** Ficha completa de un hilo (`/grupos/slug/hilos/id`). */
export async function getThreadById(
  id: string,
  viewerId?: string,
): Promise<ThreadDetail | null> {
  const [row] = await getDb()
    .select({
      id: thread.id,
      type: thread.type,
      title: thread.title,
      body: thread.body,
      imageIds: thread.imageIds,
      pinned: thread.pinned,
      locked: thread.locked,
      solutionPostId: thread.solutionPostId,
      createdAt: thread.createdAt,
      lastActivityAt: thread.lastActivityAt,
      authorId: thread.authorId,
      authorName: user.name,
      authorUsername: user.username,
      authorImage: user.image,
      groupId: group.id,
      groupSlug: group.slug,
      groupName: group.name,
      viewerRole: viewerMember.role,
      viewerStatus: viewerMember.status,
      projectName: project.name,
      projectSlug: project.slug,
      projectUsername: projectUser.username,
      projectOwnerId: project.userId,
      projectVisibility: project.visibility,
      projectCover: image,
      patternName: pattern.name,
      patternSlug: pattern.slug,
    })
    .from(thread)
    .innerJoin(group, eq(thread.groupId, group.id))
    .innerJoin(user, eq(thread.authorId, user.id))
    .leftJoin(
      viewerMember,
      and(
        eq(viewerMember.groupId, thread.groupId),
        eq(viewerMember.userId, viewerId ?? ""),
      ),
    )
    .leftJoin(
      project,
      and(eq(project.id, thread.projectId), isNull(project.deletedAt)),
    )
    .leftJoin(projectUser, eq(project.userId, projectUser.id))
    .leftJoin(image, eq(project.coverImageId, image.id))
    .leftJoin(pattern, eq(project.patternId, pattern.id))
    .where(eq(thread.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const detail = row as ThreadDetailRow;
  const images = await fetchImages(detail.imageIds);

  return {
    id: detail.id,
    type: detail.type,
    title: detail.title,
    body: detail.body,
    photos: photoViews(detail.imageIds, images),
    pinned: detail.pinned,
    locked: detail.locked,
    solutionPostId: detail.solutionPostId,
    createdAt: detail.createdAt,
    lastActivityAt: detail.lastActivityAt,
    author: {
      name: detail.authorName,
      username: detail.authorUsername,
      image: detail.authorImage,
    },
    group: {
      id: detail.groupId,
      slug: detail.groupSlug,
      name: detail.groupName,
    },
    viewerRole: detail.viewerStatus === "activo" ? detail.viewerRole : null,
    viewerPending: detail.viewerStatus === "pendiente",
    isAuthor: viewerId ? detail.authorId === viewerId : false,
    project:
      detail.projectSlug !== null &&
      (detail.projectVisibility === "publico" ||
        (viewerId !== undefined && detail.projectOwnerId === viewerId))
        ? {
            name: detail.projectName!,
            slug: detail.projectSlug,
            username: detail.projectUsername,
            cover: detail.projectCover
              ? toPhotoView(detail.projectCover)
              : null,
            patternName: detail.patternName,
            patternSlug: detail.patternSlug,
          }
        : null,
  };
}

export type PostView = {
  id: string;
  body: string;
  photos: PhotoView[];
  createdAt: Date;
  author: ThreadAuthor;
};

/** Respuestas de un hilo, de la más vieja a la más nueva. */
export async function listPosts(threadId: string): Promise<PostView[]> {
  const rows = await getDb()
    .select({
      id: post.id,
      body: post.body,
      imageIds: post.imageIds,
      createdAt: post.createdAt,
      authorName: user.name,
      authorUsername: user.username,
      authorImage: user.image,
    })
    .from(post)
    .innerJoin(user, eq(post.authorId, user.id))
    .where(eq(post.threadId, threadId))
    .orderBy(asc(post.createdAt));

  // Todas las fotos del hilo en una consulta, no una por respuesta.
  const images = await fetchImages([
    ...new Set(rows.flatMap((row) => row.imageIds)),
  ]);

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    photos: photoViews(row.imageIds, images),
    createdAt: row.createdAt,
    author: {
      name: row.authorName,
      username: row.authorUsername,
      image: row.authorImage,
    },
  }));
}

export type HelpProject = {
  id: string;
  name: string;
  cover: PhotoView | null;
  patternName: string | null;
};

/** Proyecto propio y vivo que va a acompañar una pregunta ("Pedir ayuda"). */
export async function getOwnProjectForHelp(
  projectId: string,
  userId: string,
): Promise<HelpProject | null> {
  const [row] = await getDb()
    .select({
      id: project.id,
      name: project.name,
      cover: image,
      patternName: pattern.name,
    })
    .from(project)
    .leftJoin(image, eq(project.coverImageId, image.id))
    .leftJoin(pattern, eq(project.patternId, pattern.id))
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    cover: row.cover ? toPhotoView(row.cover) : null,
    patternName: row.patternName,
  };
}

type ImageRows = Map<string, typeof image.$inferSelect>;

async function fetchImages(ids: string[]): Promise<ImageRows> {
  if (ids.length === 0) {
    return new Map();
  }
  const rows = await getDb().select().from(image).where(inArray(image.id, ids));
  return new Map(rows.map((row) => [row.id, row]));
}

/** Fotos en el orden pedido; las que ya no existen se saltean. */
function photoViews(ids: string[], images: ImageRows): PhotoView[] {
  return ids
    .map((id) => images.get(id))
    .filter((row): row is typeof image.$inferSelect => row !== undefined)
    .map((row) => toPhotoView(row));
}
