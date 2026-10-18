import { and, asc, count, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { tool } from "@/db/tool-schema";

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
