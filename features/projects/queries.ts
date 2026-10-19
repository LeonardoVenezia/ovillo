import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db";
import { user } from "@/db/auth-schema";
import { image } from "@/db/media-schema";
import { pattern } from "@/db/pattern-schema";
import {
  isProjectStatus,
  project,
  type ProjectStatus,
} from "@/db/project-schema";
import { projectYarn, stashItem } from "@/db/stash-schema";
import { isCraft } from "@/features/profile/constants";
import { likeContains } from "@/lib/search";
import { normalizeText } from "@/lib/slug";

import type { ImageRow } from "./media-queries";

/**
 * Consultas de proyectos (spec §5.3 y galerías de §5.5–§5.6). El borrado es
 * lógico, así que todas filtran `deleted_at is null`.
 */

export type Project = typeof project.$inferSelect;

/** Proyecto propio con el patrón de la biblioteca ya resuelto para enlazar. */
export type OwnProject = Project & {
  linkedPattern: { slug: string; name: string } | null;
};

/** Los proyectos de una persona, del más nuevo al más viejo. */
export async function listProjects(userId: string): Promise<Project[]> {
  return getDb()
    .select()
    .from(project)
    .where(and(eq(project.userId, userId), isNull(project.deletedAt)))
    .orderBy(desc(project.createdAt));
}

/** El proyecto propio que corresponde a una URL `/mi-tejido/proyectos/x`. */
export async function getProjectBySlug(
  userId: string,
  slug: string,
): Promise<OwnProject | null> {
  const rows = await getDb()
    .select({
      ...getTableColumns(project),
      linkedPattern: { slug: pattern.slug, name: pattern.name },
    })
    .from(project)
    .leftJoin(pattern, eq(project.patternId, pattern.id))
    .where(
      and(
        eq(project.userId, userId),
        eq(project.slug, slug),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }
  const { linkedPattern, ...rest } = row;
  return {
    ...rest,
    linkedPattern: linkedPattern?.slug
      ? { slug: linkedPattern.slug, name: linkedPattern.name ?? "" }
      : null,
  };
}

/** Los últimos proyectos públicos de una persona, para su perfil. */
export async function listLatestPublicProjects(
  userId: string,
  limit = 6,
): Promise<{ items: Project[]; total: number }> {
  const where = and(
    eq(project.userId, userId),
    eq(project.visibility, "publico"),
    isNull(project.deletedAt),
  );

  const [items, totals] = await Promise.all([
    getDb()
      .select()
      .from(project)
      .where(where)
      .orderBy(desc(project.createdAt))
      .limit(limit),
    getDb().select({ value: count() }).from(project).where(where),
  ]);

  return { items, total: totals[0]?.value ?? 0 };
}

export type PublicProjectPage = {
  project: Project;
  owner: {
    id: string;
    name: string;
    username: string | null;
    image: string | null;
  };
  linkedPattern: { slug: string; name: string } | null;
};

/** Proyecto público por `@usuario` + slug; `null` si no existe. */
export async function getProjectByUsername(
  username: string,
  slug: string,
): Promise<PublicProjectPage | null> {
  const rows = await getDb()
    .select({
      project,
      owner: {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      },
      linkedPattern: { slug: pattern.slug, name: pattern.name },
    })
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .leftJoin(pattern, eq(project.patternId, pattern.id))
    .where(
      and(
        eq(user.username, username),
        eq(project.slug, slug),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }
  const { linkedPattern, ...rest } = row;
  return {
    ...rest,
    linkedPattern: linkedPattern?.slug
      ? { slug: linkedPattern.slug, name: linkedPattern.name ?? "" }
      : null,
  };
}

/** Cuántos proyectos se muestran de una vez en la galería pública. */
export const COMMUNITY_PAGE_SIZE = 24;

/**
 * Fila de la galería "hechos por la comunidad" (spec §5.5): el proyecto con
 * su dueña y su portada, sin decidir todavía la URL de la foto.
 */
export type CommunityProjectRow = {
  id: string;
  slug: string;
  name: string;
  status: ProjectStatus;
  visibility: string;
  finishedAt: string | null;
  updatedAt: Date;
  ownerName: string;
  ownerUsername: string | null;
  ownerImage: string | null;
  cover: ImageRow | null;
};

const communityColumns = {
  id: project.id,
  slug: project.slug,
  name: project.name,
  status: project.status,
  visibility: project.visibility,
  finishedAt: project.finishedAt,
  updatedAt: project.updatedAt,
  ownerName: user.name,
  ownerUsername: user.username,
  ownerImage: user.image,
  cover: image,
};

export type CommunityFilters = {
  q?: string;
  /** Slug de técnica (`dos-agujas`, `crochet`, `telar`, `otras`). */
  craft?: string;
  status?: string;
};

/**
 * Proyectos públicos para `/explorar/proyectos`: los más nuevos primero,
 * con búsqueda por nombre (sin acentos) y filtros de técnica y estado.
 */
export async function listCommunityProjects(
  filters: CommunityFilters = {},
  limit: number = COMMUNITY_PAGE_SIZE,
): Promise<{ items: CommunityProjectRow[]; total: number }> {
  const conditions = [
    eq(project.visibility, "publico"),
    isNull(project.deletedAt),
  ];

  const query = normalizeText(filters.q ?? "").slice(0, 80);
  if (query.length > 0) {
    conditions.push(
      ilike(
        sql`translate(lower(${project.name}), 'áéíóúüñ', 'aeiouun')`,
        likeContains(query),
      ),
    );
  }
  if (filters.craft && isCraft(filters.craft)) {
    conditions.push(eq(project.craft, filters.craft));
  }
  if (filters.status && isProjectStatus(filters.status)) {
    conditions.push(eq(project.status, filters.status));
  }

  const where = and(...conditions);

  const [items, totals] = await Promise.all([
    getDb()
      .select(communityColumns)
      .from(project)
      .innerJoin(user, eq(project.userId, user.id))
      .leftJoin(image, eq(project.coverImageId, image.id))
      .where(where)
      .orderBy(desc(project.createdAt))
      .limit(limit),
    getDb().select({ value: count() }).from(project).where(where),
  ]);

  return { items, total: totals[0]?.value ?? 0 };
}

/**
 * Galería "hechos por la comunidad" de una ficha de patrón (spec §5.5):
 * los proyectos públicos que usan ese patrón y, si hay sesión, también los
 * propios (aunque sean privados: se marcan como "solo para mí"). Los
 * terminados van primero.
 */
export async function listPatternProjects(
  patternId: string,
  viewerId: string | null,
): Promise<CommunityProjectRow[]> {
  const visibility = viewerId
    ? or(eq(project.visibility, "publico"), eq(project.userId, viewerId))
    : eq(project.visibility, "publico");

  return getDb()
    .select(communityColumns)
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .leftJoin(image, eq(project.coverImageId, image.id))
    .where(
      and(
        eq(project.patternId, patternId),
        isNull(project.deletedAt),
        visibility,
      ),
    )
    .orderBy(
      desc(sql`${project.status} = 'terminado'`),
      sql`${project.finishedAt} desc nulls last`,
      desc(project.updatedAt),
    );
}

/**
 * Galería "hechos por la comunidad" de una ficha de lana (spec §5.6): los
 * proyectos que la usan, sea asignada desde el inventario o como referencia
 * del catálogo. Mismas reglas que en los patrones: públicos siempre, propios
 * también con sesión (se marcan), y los terminados primero. Un proyecto con
 * la lana cargada dos veces sale una sola vez.
 */
export async function listYarnProjects(
  yarnId: string,
  viewerId: string | null,
): Promise<CommunityProjectRow[]> {
  const visibility = viewerId
    ? or(eq(project.visibility, "publico"), eq(project.userId, viewerId))
    : eq(project.visibility, "publico");

  const rows = await getDb()
    .select(communityColumns)
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .leftJoin(image, eq(project.coverImageId, image.id))
    .innerJoin(projectYarn, eq(projectYarn.projectId, project.id))
    .leftJoin(stashItem, eq(projectYarn.stashItemId, stashItem.id))
    .where(
      and(
        or(eq(projectYarn.yarnId, yarnId), eq(stashItem.yarnId, yarnId)),
        isNull(project.deletedAt),
        visibility,
      ),
    )
    .orderBy(
      desc(sql`${project.status} = 'terminado'`),
      sql`${project.finishedAt} desc nulls last`,
      desc(project.updatedAt),
    );

  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) {
      return false;
    }
    seen.add(row.id);
    return true;
  });
}
