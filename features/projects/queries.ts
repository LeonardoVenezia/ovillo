import { and, count, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { user } from "@/db/auth-schema";
import { project } from "@/db/project-schema";

/**
 * Consultas de proyectos (spec §5.3). El borrado es lógico, así que todas
 * filtran `deleted_at is null`.
 */

export type Project = typeof project.$inferSelect;

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
): Promise<Project | null> {
  const rows = await getDb()
    .select()
    .from(project)
    .where(
      and(
        eq(project.userId, userId),
        eq(project.slug, slug),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Los últimos proyectos públicos de alguien, para su perfil (spec §5.2). */
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
    })
    .from(project)
    .innerJoin(user, eq(project.userId, user.id))
    .where(
      and(
        eq(user.username, username),
        eq(project.slug, slug),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
