"use server";

import { and, count, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { project } from "@/db/project-schema";
import { projectTool, tool } from "@/db/tool-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import { getOwnProjectTool, getOwnTool } from "./queries";
import {
  TOOLS_PER_USER_MAX,
  projectToolLinkSchema,
  toolCreateSchema,
  toolUpdateSchema,
  type ToolCreateInput,
} from "./schemas";

/**
 * Acciones del inventario de herramientas (spec §5.7 y §9: Zod + autorización
 * en cada mutación). El largo del cable solo se guarda en las circulares; el
 * resto de combinaciones se limpian acá, no en la interfaz.
 *
 * Los vínculos con proyectos (`project_tool`, spec §5.3) viven acá también:
 * son información del proyecto y no descuentan nada del inventario.
 */

export type ToolActionResult = { ok: true } | { ok: false; error: string };

export type ToolCreateResult =
  { ok: true; id: string } | { ok: false; error: string };

/** Deja el input listo para la base (cable solo en circulares, textos vacíos en null). */
function normalize(input: ToolCreateInput) {
  return {
    kind: input.kind,
    sizeMm: input.sizeMm,
    material: input.material,
    lengthCm: input.kind === "circulares" ? input.lengthCm : null,
    quantity: input.quantity,
    notes:
      input.notes === null || input.notes.length === 0 ? null : input.notes,
  };
}

/** Agrega una herramienta al inventario propio. */
export async function createTool(input: unknown): Promise<ToolCreateResult> {
  const user = await requireUser();
  const parsed = toolCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.tools.errors.generic };
  }

  const [existing] = await getDb()
    .select({ value: count() })
    .from(tool)
    .where(eq(tool.userId, user.id));
  if ((existing?.value ?? 0) >= TOOLS_PER_USER_MAX) {
    return { ok: false, error: es.tools.errors.limit };
  }

  const [created] = await getDb()
    .insert(tool)
    .values({ userId: user.id, ...normalize(parsed.data) })
    .returning({ id: tool.id });

  return { ok: true, id: created.id };
}

/** Corrige una herramienta propia (medida, material, cantidad, notas). */
export async function updateTool(input: unknown): Promise<ToolActionResult> {
  const user = await requireUser();
  const parsed = toolUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.tools.errors.generic };
  }

  const own = await getOwnTool(user.id, parsed.data.id);
  if (!own) {
    return { ok: false, error: es.tools.errors.notFound };
  }

  await getDb()
    .update(tool)
    .set(normalize(parsed.data))
    .where(eq(tool.id, own.id));

  return { ok: true };
}

/** Elimina una herramienta propia (definitivo: el inventario no tiene papelera). */
export async function deleteTool(toolId: string): Promise<ToolActionResult> {
  const user = await requireUser();
  if (typeof toolId !== "string" || toolId.length === 0) {
    return { ok: false, error: es.tools.errors.generic };
  }

  const own = await getOwnTool(user.id, toolId);
  if (!own) {
    return { ok: false, error: es.tools.errors.notFound };
  }

  await getDb().delete(tool).where(eq(tool.id, own.id));
  return { ok: true };
}

/** Proyecto propio y vivo: la puerta de entrada de las asignaciones. */
async function getOwnProject(userId: string, projectId: string) {
  const rows = await getDb()
    .select({ id: project.id })
    .from(project)
    .where(
      and(
        eq(project.id, projectId),
        eq(project.userId, userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Suma una herramienta propia a un proyecto propio (spec §5.3). */
export async function addProjectTool(
  input: unknown,
): Promise<ToolActionResult> {
  const user = await requireUser();
  const parsed = projectToolLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.tools.errors.generic };
  }

  const own = await getOwnProject(user.id, parsed.data.projectId);
  if (!own) {
    return { ok: false, error: es.tools.errors.projectNotFound };
  }

  const ownTool = await getOwnTool(user.id, parsed.data.toolId);
  if (!ownTool) {
    return { ok: false, error: es.tools.errors.notFound };
  }

  const [existing] = await getDb()
    .select({ id: projectTool.id })
    .from(projectTool)
    .where(
      and(
        eq(projectTool.projectId, own.id),
        eq(projectTool.toolId, ownTool.id),
      ),
    )
    .limit(1);
  if (existing) {
    return { ok: false, error: es.tools.errors.projectToolDuplicate };
  }

  await getDb()
    .insert(projectTool)
    .values({ projectId: own.id, toolId: ownTool.id });

  return { ok: true };
}

/** Quita una herramienta del proyecto (sin tocar el inventario). */
export async function removeProjectTool(
  linkId: string,
): Promise<ToolActionResult> {
  const user = await requireUser();
  if (typeof linkId !== "string" || linkId.length === 0) {
    return { ok: false, error: es.tools.errors.generic };
  }

  const own = await getOwnProjectTool(user.id, linkId);
  if (!own) {
    return { ok: false, error: es.tools.errors.projectToolNotFound };
  }

  await getDb().delete(projectTool).where(eq(projectTool.id, own.id));
  return { ok: true };
}
