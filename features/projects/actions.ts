"use server";

import { createId } from "@paralleldrive/cuid2";
import { and, eq, isNull, like } from "drizzle-orm";

import { getDb } from "@/db";
import {
  isProjectStatus,
  project,
  type ProjectStatus,
} from "@/db/project-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import { projectInputSchema, slugifyProjectName } from "./schemas";

/**
 * Acciones de proyectos (spec §9: validación Zod + autorización en servidor
 * en cada mutación). Devuelven un resultado simple para que la UI muestre el
 * error sin romperse.
 */

export type ProjectActionResult =
  { ok: true; slug: string } | { ok: false; error: string };

/** Fecha de hoy (UTC) en formato `YYYY-MM-DD` para las columnas `date`. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Slug único por persona: parte del nombre y, si está tomado, `-2`, `-3`…
 * (el nombre puede repetirse; la URL del proyecto no).
 */
async function uniqueSlug(userId: string, name: string): Promise<string> {
  const base = slugifyProjectName(name);
  const rows = await getDb()
    .select({ slug: project.slug })
    .from(project)
    .where(and(eq(project.userId, userId), like(project.slug, `${base}%`)));

  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(base)) {
    return base;
  }
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  return `${base}-${createId().slice(0, 6)}`;
}

/** Proyecto propio por id, con autorización: `null` si no es de esa persona. */
async function getOwnProject(userId: string, id: string) {
  const rows = await getDb()
    .select()
    .from(project)
    .where(
      and(
        eq(project.id, id),
        eq(project.userId, userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function createProject(
  input: unknown,
): Promise<ProjectActionResult> {
  const user = await requireUser();
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.projects.errors.generic };
  }

  const data = parsed.data;
  const slug = await uniqueSlug(user.id, data.name);

  await getDb()
    .insert(project)
    .values({
      userId: user.id,
      slug,
      name: data.name,
      craft: data.craft || null,
      status: data.status,
      progress: data.progress,
      patternText: data.patternText || null,
      size: data.size || null,
      madeFor: data.madeFor || null,
      startedAt: data.startedAt || null,
      finishedAt: data.status === "terminado" ? todayIso() : null,
      tags: data.tags,
      notes: data.notes || null,
      visibility: data.visibility,
    });

  return { ok: true, slug };
}

export async function updateProject(
  id: string,
  input: unknown,
): Promise<ProjectActionResult> {
  const user = await requireUser();
  const parsed = projectInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.projects.errors.generic };
  }

  const existing = await getOwnProject(user.id, id);
  if (!existing) {
    return { ok: false, error: es.projects.errors.notFound };
  }

  const data = parsed.data;
  await getDb()
    .update(project)
    .set({
      name: data.name,
      craft: data.craft || null,
      status: data.status,
      progress: data.progress,
      patternText: data.patternText || null,
      size: data.size || null,
      madeFor: data.madeFor || null,
      startedAt: data.startedAt || null,
      finishedAt:
        data.status === "terminado"
          ? (existing.finishedAt ?? todayIso())
          : null,
      tags: data.tags,
      notes: data.notes || null,
      visibility: data.visibility,
    })
    .where(eq(project.id, existing.id));

  return { ok: true, slug: existing.slug };
}

/** Cambio rápido de estado desde la página del proyecto. */
export async function setProjectStatus(
  id: string,
  status: ProjectStatus,
): Promise<ProjectActionResult> {
  const user = await requireUser();
  if (!isProjectStatus(status)) {
    return { ok: false, error: es.projects.errors.generic };
  }

  const existing = await getOwnProject(user.id, id);
  if (!existing) {
    return { ok: false, error: es.projects.errors.notFound };
  }

  await getDb()
    .update(project)
    .set({
      status,
      finishedAt:
        status === "terminado" ? (existing.finishedAt ?? todayIso()) : null,
    })
    .where(eq(project.id, existing.id));

  return { ok: true, slug: existing.slug };
}

/** Borrado lógico (spec §6): el proyecto deja de verse, no se pierde. */
export async function deleteProject(id: string): Promise<ProjectActionResult> {
  const user = await requireUser();
  const existing = await getOwnProject(user.id, id);
  if (!existing) {
    return { ok: false, error: es.projects.errors.notFound };
  }

  await getDb()
    .update(project)
    .set({ deletedAt: new Date() })
    .where(eq(project.id, existing.id));

  return { ok: true, slug: existing.slug };
}
