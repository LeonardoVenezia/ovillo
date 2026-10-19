import { and, asc, count, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { project } from "@/db/project-schema";
import { projectTool, tool } from "@/db/tool-schema";

/**
 * Consultas del inventario de herramientas (spec §5.7). Siempre del lado
 * dueño: las herramientas son privadas, como el cuaderno.
 */

export type Tool = typeof tool.$inferSelect;

/** Herramientas de una persona, de la más fina a la más gruesa. */
export async function listTools(userId: string): Promise<Tool[]> {
  return getDb()
    .select()
    .from(tool)
    .where(eq(tool.userId, userId))
    .orderBy(asc(tool.sizeMm), asc(tool.createdAt));
}

export async function countTools(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(tool)
    .where(eq(tool.userId, userId));
  return row?.value ?? 0;
}

/** Una herramienta propia: autorización en un solo lugar. */
export async function getOwnTool(
  userId: string,
  toolId: string,
): Promise<Tool | null> {
  const rows = await getDb()
    .select()
    .from(tool)
    .where(and(eq(tool.id, toolId), eq(tool.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

/** Una herramienta de un proyecto, con el id del vínculo para poder quitarla. */
export type ProjectToolItem = Tool & { linkId: string };

/** Las herramientas de un proyecto (spec §5.3), de la más fina a la más gruesa. */
export async function listProjectTools(
  projectId: string,
): Promise<ProjectToolItem[]> {
  const rows = await getDb()
    .select({ linkId: projectTool.id, tool })
    .from(projectTool)
    .innerJoin(tool, eq(projectTool.toolId, tool.id))
    .where(eq(projectTool.projectId, projectId))
    .orderBy(asc(tool.sizeMm), asc(tool.createdAt));

  return rows.map((row) => ({ ...row.tool, linkId: row.linkId }));
}

/** Un vínculo herramienta-proyecto propio: autorización vía el proyecto. */
export async function getOwnProjectTool(
  userId: string,
  linkId: string,
): Promise<{ id: string; toolId: string } | null> {
  const rows = await getDb()
    .select({ id: projectTool.id, toolId: projectTool.toolId })
    .from(projectTool)
    .innerJoin(project, eq(projectTool.projectId, project.id))
    .where(
      and(
        eq(projectTool.id, linkId),
        eq(project.userId, userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
