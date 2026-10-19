import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db";
import {
  group,
  groupMember,
  type GroupCategory,
  type GroupMemberStatus,
  type GroupRole,
  type JoinPolicy,
} from "@/db/community-schema";
import { user } from "@/db/auth-schema";
import { image } from "@/db/media-schema";
import { toPhotoView, type PhotoView } from "@/features/projects/media-view";
import { likeContains } from "@/lib/search";
import { normalizeText } from "@/lib/slug";

import { sortGroupMembers } from "./schemas";

/**
 * Lecturas de la comunidad (spec §5.9).
 *
 * Todo se lee en el momento, sin caché compartida: los grupos cambian con
 * cada unión y la ficha necesita el estado de quien mira (D-054). Las páginas
 * que usan estas consultas las dejan siempre detrás de un `<Suspense>`.
 *
 * El contador de integrantes va como subconsulta escalar para no multiplicar
 * filas al sumar el estado de quien mira.
 */

/** Tarjeta de grupo: lo que ven el directorio y la portada. */
export type CommunityGroup = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: GroupCategory;
  joinPolicy: JoinPolicy;
  image: PhotoView | null;
  /** Integrantes activos (los pendientes no cuentan). */
  members: number;
  /** Rol de quien mira si ya es parte; `null` si no lo es. */
  viewerRole: GroupRole | null;
  /** Solicitud pendiente de quien mira. */
  viewerPending: boolean;
};

/** Ficha completa: agrega lo que solo hace falta en `/grupos/slug`. */
export type CommunityGroupDetail = CommunityGroup & {
  rules: string;
  creatorName: string;
  creatorUsername: string | null;
};

export type GroupMemberView = {
  userId: string;
  name: string;
  username: string | null;
  image: string | null;
  role: GroupRole;
  createdAt: Date;
};

const viewerMember = alias(groupMember, "viewer_member");

const memberCountSql = sql<number>`(
  select count(*) from ${groupMember}
  where ${groupMember.groupId} = ${group.id}
    and ${groupMember.status} = 'activo'
)`;

/** Columnas compartidas del listado y la ficha (sin `rules`, que es larga). */
const groupCardSelect = {
  id: group.id,
  slug: group.slug,
  name: group.name,
  description: group.description,
  category: group.category,
  joinPolicy: group.joinPolicy,
  imageRow: image,
  members: memberCountSql,
  viewerRole: viewerMember.role,
  viewerStatus: viewerMember.status,
};

type GroupCardRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: GroupCategory;
  joinPolicy: JoinPolicy;
  imageRow: typeof image.$inferSelect | null;
  members: number;
  viewerRole: GroupRole | null;
  viewerStatus: GroupMemberStatus | null;
};

function toCommunityGroup(row: GroupCardRow): CommunityGroup {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    joinPolicy: row.joinPolicy,
    image: row.imageRow ? toPhotoView(row.imageRow) : null,
    members: row.members,
    viewerRole: row.viewerStatus === "activo" ? row.viewerRole : null,
    viewerPending: row.viewerStatus === "pendiente",
  };
}

/** Condición de búsqueda del directorio: nombre o descripción, sin acentos. */
function searchCondition(query: string) {
  const term = normalizeText(query).slice(0, 80);
  if (term.length === 0) {
    return undefined;
  }
  const like = likeContains(term);
  return or(
    ilike(sql`translate(lower(${group.name}), 'áéíóúüñ', 'aeiouun')`, like),
    ilike(
      sql`translate(lower(${group.description}), 'áéíóúüñ', 'aeiouun')`,
      like,
    ),
  );
}

export type ListGroupsFilters = {
  /** Quien mira, para marcar "ya sos parte" o la solicitud enviada. */
  viewerId?: string;
  /** Búsqueda libre por nombre o descripción. */
  q?: string;
  category?: GroupCategory;
  limit?: number;
};

/** Directorio de grupos: con más integrantes primero y, a igualdad, por nombre. */
export async function listGroups(
  filters: ListGroupsFilters = {},
): Promise<CommunityGroup[]> {
  const conditions = [];
  const search = searchCondition(filters.q ?? "");
  if (search) {
    conditions.push(search);
  }
  if (filters.category) {
    conditions.push(eq(group.category, filters.category));
  }

  const query = getDb()
    .select(groupCardSelect)
    .from(group)
    .innerJoin(user, eq(group.createdBy, user.id))
    .leftJoin(image, eq(group.imageId, image.id))
    .leftJoin(
      viewerMember,
      and(
        eq(viewerMember.groupId, group.id),
        eq(viewerMember.userId, filters.viewerId ?? ""),
      ),
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(memberCountSql), asc(group.name));

  const rows = filters.limit ? await query.limit(filters.limit) : await query;
  return rows.map(toCommunityGroup);
}

/** Ficha pública de un grupo (`/grupos/slug`). */
export async function getGroupBySlug(
  slug: string,
  viewerId?: string,
): Promise<CommunityGroupDetail | null> {
  const [row] = await getDb()
    .select({
      ...groupCardSelect,
      rules: group.rules,
      creatorName: user.name,
      creatorUsername: user.username,
    })
    .from(group)
    .innerJoin(user, eq(group.createdBy, user.id))
    .leftJoin(image, eq(group.imageId, image.id))
    .leftJoin(
      viewerMember,
      and(
        eq(viewerMember.groupId, group.id),
        eq(viewerMember.userId, viewerId ?? ""),
      ),
    )
    .where(eq(group.slug, slug))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...toCommunityGroup(row),
    rules: row.rules,
    creatorName: row.creatorName,
    creatorUsername: row.creatorUsername,
  };
}

/** Integrantes de un grupo (activos), con quien lo creó primero. */
export async function listGroupMembers(
  groupId: string,
): Promise<GroupMemberView[]> {
  const rows = await getDb()
    .select({
      userId: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      role: groupMember.role,
      createdAt: groupMember.createdAt,
    })
    .from(groupMember)
    .innerJoin(user, eq(groupMember.userId, user.id))
    .where(
      and(eq(groupMember.groupId, groupId), eq(groupMember.status, "activo")),
    );

  return sortGroupMembers(rows);
}

/** Solicitudes de ingreso, de la más vieja a la más nueva. */
export async function listPendingMembers(
  groupId: string,
): Promise<GroupMemberView[]> {
  return getDb()
    .select({
      userId: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      role: groupMember.role,
      createdAt: groupMember.createdAt,
    })
    .from(groupMember)
    .innerJoin(user, eq(groupMember.userId, user.id))
    .where(
      and(
        eq(groupMember.groupId, groupId),
        eq(groupMember.status, "pendiente"),
      ),
    )
    .orderBy(asc(groupMember.createdAt));
}

export type UserGroup = {
  group: CommunityGroup;
  role: GroupRole;
  status: GroupMemberStatus;
};

/** Los grupos de una persona: primero los que ya integra, después solicitudes. */
export async function listUserGroups(userId: string): Promise<UserGroup[]> {
  const rows = await getDb()
    .select(groupCardSelect)
    .from(viewerMember)
    .innerJoin(group, eq(viewerMember.groupId, group.id))
    .innerJoin(user, eq(group.createdBy, user.id))
    .leftJoin(image, eq(group.imageId, image.id))
    .where(eq(viewerMember.userId, userId))
    .orderBy(asc(viewerMember.status), asc(group.name));

  return rows.map((row) => ({
    group: toCommunityGroup(row),
    // La fila es la propia membresía: rol y estado siempre están.
    role: row.viewerRole!,
    status: row.viewerStatus!,
  }));
}
