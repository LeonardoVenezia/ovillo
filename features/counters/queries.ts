import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { rowCounter } from "@/db/counter-schema";
import { project } from "@/db/project-schema";

/**
 * Consultas de contadores (spec §5.4). Siempre del lado dueño: los
 * contadores son privados, como el cuaderno.
 */

export type Counter = typeof rowCounter.$inferSelect;

/** Contadores de un proyecto, del más viejo al más nuevo. */
export async function listProjectCounters(
  projectId: string,
): Promise<Counter[]> {
  return getDb()
    .select()
    .from(rowCounter)
    .where(eq(rowCounter.projectId, projectId))
    .orderBy(asc(rowCounter.createdAt));
}

export type OwnCounter = {
  counter: Counter;
  project: { id: string; name: string; slug: string };
};

/** Un contador propio con su proyecto: autorización en un solo lugar. */
export async function getOwnCounter(
  userId: string,
  counterId: string,
): Promise<OwnCounter | null> {
  const rows = await getDb()
    .select({
      counter: rowCounter,
      project: { id: project.id, name: project.name, slug: project.slug },
    })
    .from(rowCounter)
    .innerJoin(project, eq(rowCounter.projectId, project.id))
    .where(
      and(
        eq(rowCounter.id, counterId),
        eq(project.userId, userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
