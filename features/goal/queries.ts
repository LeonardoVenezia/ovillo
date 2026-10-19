import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db";
import { yearlyGoal } from "@/db/goal-schema";
import { project } from "@/db/project-schema";
import { projectYarn, stashItem } from "@/db/stash-schema";
import { yarn, yarnBrand } from "@/db/yarn-schema";

import {
  buildYearSummary,
  type YearProject,
  type YearSummary,
  type YearUsage,
} from "./summary";

/**
 * Consultas de "Mi año tejiendo" (spec §5.14). Todo se lee al momento: son
 * datos privados (el resumen del perfil lo arma la página pública, que aplica
 * la visibilidad). El progreso no se guarda: sale de los proyectos con
 * `finished_at` de ese año (D-053).
 */

const stashYarn = alias(yarn, "stash_yarn");
const stashBrand = alias(yarnBrand, "stash_brand");
const catalogYarn = alias(yarn, "catalog_yarn");
const catalogBrand = alias(yarnBrand, "catalog_brand");

export type YearOverview = {
  year: number;
  /** Meta de proyectos terminados; `null` si todavía no anotó ninguna. */
  goal: number | null;
  summary: YearSummary;
};

/** El resumen del año con la meta anotada (si existe). */
export async function getYearOverview(
  userId: string,
  year: number,
): Promise<YearOverview> {
  const db = getDb();

  const [goalRows, projectRows, usageRows] = await Promise.all([
    db
      .select({ target: yearlyGoal.targetProjects })
      .from(yearlyGoal)
      .where(and(eq(yearlyGoal.userId, userId), eq(yearlyGoal.year, year)))
      .limit(1),
    db
      .select({ id: project.id, finishedAt: project.finishedAt })
      .from(project)
      .where(
        and(
          eq(project.userId, userId),
          isNull(project.deletedAt),
          isNotNull(project.finishedAt),
        ),
      ),
    db
      .select({
        projectId: projectYarn.projectId,
        stashItemId: projectYarn.stashItemId,
        catalogYarnId: projectYarn.yarnId,
        skeinsUsed: projectYarn.skeinsUsed,
        gramsUsed: projectYarn.gramsUsed,
        stashCustomName: stashItem.customName,
        stashSkeins: stashItem.skeins,
        stashGrams: stashItem.grams,
        stashMeters: stashItem.metersTotal,
        stashYarnName: stashYarn.name,
        stashYarnMeters: stashYarn.meters,
        stashYarnGrams: stashYarn.grams,
        stashBrandName: stashBrand.name,
        catalogYarnName: catalogYarn.name,
        catalogMeters: catalogYarn.meters,
        catalogGrams: catalogYarn.grams,
        catalogBrandName: catalogBrand.name,
      })
      .from(projectYarn)
      .innerJoin(project, eq(projectYarn.projectId, project.id))
      .leftJoin(stashItem, eq(projectYarn.stashItemId, stashItem.id))
      .leftJoin(stashYarn, eq(stashItem.yarnId, stashYarn.id))
      .leftJoin(stashBrand, eq(stashYarn.brandId, stashBrand.id))
      .leftJoin(catalogYarn, eq(projectYarn.yarnId, catalogYarn.id))
      .leftJoin(catalogBrand, eq(catalogYarn.brandId, catalogBrand.id))
      .where(
        and(
          eq(project.userId, userId),
          isNull(project.deletedAt),
          isNotNull(project.finishedAt),
        ),
      ),
  ]);

  type UsageRow = (typeof usageRows)[number];

  /** Traduce una asignación a lo que necesita el resumen (o la descarta). */
  function resolveUsage(row: UsageRow): YearUsage | null {
    if (row.stashItemId) {
      const label =
        row.stashCustomName ??
        (row.stashYarnName
          ? row.stashYarnName +
            (row.stashBrandName ? ` · ${row.stashBrandName}` : "")
          : null);
      if (!label) {
        return null;
      }
      const skeins =
        row.stashSkeins !== null && row.stashSkeins > 0
          ? row.stashSkeins
          : null;
      const metersPerSkein =
        skeins !== null && row.stashMeters !== null
          ? row.stashMeters / skeins
          : (row.stashYarnMeters ?? null);
      const gramsPerSkein =
        skeins !== null && row.stashGrams !== null
          ? row.stashGrams / skeins
          : (row.stashYarnGrams ?? null);
      const metersPerGram =
        row.stashMeters !== null && row.stashGrams !== null
          ? row.stashMeters / row.stashGrams
          : row.stashYarnMeters !== null && row.stashYarnGrams !== null
            ? row.stashYarnMeters / row.stashYarnGrams
            : null;
      return {
        yarnKey: `stash:${row.stashItemId}`,
        label,
        skeinsUsed: row.skeinsUsed,
        gramsUsed: row.gramsUsed,
        metersPerSkein,
        gramsPerSkein,
        metersPerGram,
      };
    }

    if (row.catalogYarnId && row.catalogYarnName) {
      return {
        yarnKey: `yarn:${row.catalogYarnId}`,
        label:
          row.catalogYarnName +
          (row.catalogBrandName ? ` · ${row.catalogBrandName}` : ""),
        skeinsUsed: row.skeinsUsed,
        gramsUsed: row.gramsUsed,
        metersPerSkein: row.catalogMeters,
        gramsPerSkein: row.catalogGrams,
        metersPerGram:
          row.catalogMeters !== null && row.catalogGrams !== null
            ? row.catalogMeters / row.catalogGrams
            : null,
      };
    }

    // La lana asignada ya no existe (referencia del catálogo borrada): sin
    // datos no se puede sumar, y no se inventa nada.
    return null;
  }

  const usagesByProject = new Map<string, YearUsage[]>();
  for (const row of usageRows) {
    const usage = resolveUsage(row);
    if (!usage) {
      continue;
    }
    const list = usagesByProject.get(row.projectId) ?? [];
    list.push(usage);
    usagesByProject.set(row.projectId, list);
  }

  const projects: YearProject[] = [];
  for (const row of projectRows) {
    if (!row.finishedAt) {
      continue;
    }
    projects.push({
      id: row.id,
      finishedAt: row.finishedAt,
      usages: usagesByProject.get(row.id) ?? [],
    });
  }

  return {
    year,
    goal: goalRows[0]?.target ?? null,
    summary: buildYearSummary(projects, year),
  };
}
