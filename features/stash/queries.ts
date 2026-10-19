import {
  and,
  asc,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db";
import { image } from "@/db/media-schema";
import { project } from "@/db/project-schema";
import { projectYarn, stashItem, type ColorFamily } from "@/db/stash-schema";
import { yarn, yarnBrand, type YarnWeight } from "@/db/yarn-schema";
import { thumbUrlFor } from "@/features/projects/media-view";

/**
 * Consultas del inventario de lana (spec §5.7). Siempre del lado dueño: el
 * inventario es privado, como el cuaderno.
 *
 * La cantidad **asignada** a proyectos se calcula acá (nunca se guarda): suma
 * lo que los proyectos activos están usando, así asignar descuenta y frogear
 * devuelve solo (spec §5.3). Los proyectos frogueados o borrados no cuentan.
 */

export type StashItem = typeof stashItem.$inferSelect;

export type StashYarn = {
  id: string;
  name: string;
  slug: string;
  weight: YarnWeight;
  meters: number | null;
  grams: number | null;
  brandName: string;
  brandSlug: string;
};

export type StashListItem = {
  id: string;
  yarnId: string | null;
  customName: string | null;
  colorway: string | null;
  colorFamily: ColorFamily | null;
  /** Grosor propio (solo cargas libres); en las vinculadas vale el del catálogo. */
  weight: YarnWeight | null;
  dyeLot: string | null;
  skeins: number | null;
  grams: number | null;
  metersTotal: number | null;
  location: string | null;
  notes: string | null;
  imageId: string | null;
  imageThumbUrl: string | null;
  yarn: StashYarn | null;
  assignedSkeins: number;
  assignedGrams: number;
};

/**
 * Las lanas del inventario de una persona, de la más nueva a la más vieja,
 * con la lana del catálogo (si está vinculada) y lo asignado a proyectos.
 */
export async function listStashItems(userId: string): Promise<StashListItem[]> {
  const assigned = getDb()
    .select({
      stashItemId: projectYarn.stashItemId,
      skeins: sql<number>`coalesce(sum(${projectYarn.skeinsUsed}), 0)::int`.as(
        "assigned_skeins",
      ),
      grams: sql<number>`coalesce(sum(${projectYarn.gramsUsed}), 0)::int`.as(
        "assigned_grams",
      ),
    })
    .from(projectYarn)
    .innerJoin(project, eq(projectYarn.projectId, project.id))
    .where(
      and(
        isNotNull(projectYarn.stashItemId),
        isNull(project.deletedAt),
        ne(project.status, "frogueado"),
      ),
    )
    .groupBy(projectYarn.stashItemId)
    .as("assigned_stash");

  const rows = await getDb()
    .select({
      id: stashItem.id,
      yarnId: stashItem.yarnId,
      customName: stashItem.customName,
      colorway: stashItem.colorway,
      colorFamily: stashItem.colorFamily,
      weight: stashItem.weight,
      dyeLot: stashItem.dyeLot,
      skeins: stashItem.skeins,
      grams: stashItem.grams,
      metersTotal: stashItem.metersTotal,
      location: stashItem.location,
      notes: stashItem.notes,
      imageId: stashItem.imageId,
      imageR2Key: image.r2Key,
      yarnName: yarn.name,
      yarnSlug: yarn.slug,
      yarnWeight: yarn.weight,
      yarnMeters: yarn.meters,
      yarnGrams: yarn.grams,
      brandName: yarnBrand.name,
      brandSlug: yarnBrand.slug,
      assignedSkeins: assigned.skeins,
      assignedGrams: assigned.grams,
    })
    .from(stashItem)
    .leftJoin(yarn, eq(stashItem.yarnId, yarn.id))
    .leftJoin(yarnBrand, eq(yarn.brandId, yarnBrand.id))
    .leftJoin(assigned, eq(assigned.stashItemId, stashItem.id))
    .leftJoin(image, eq(stashItem.imageId, image.id))
    .where(eq(stashItem.userId, userId))
    .orderBy(desc(stashItem.createdAt));

  return rows.map((row) => ({
    id: row.id,
    yarnId: row.yarnId,
    customName: row.customName,
    colorway: row.colorway,
    colorFamily: row.colorFamily,
    weight: row.weight,
    dyeLot: row.dyeLot,
    skeins: row.skeins,
    grams: row.grams,
    metersTotal: row.metersTotal,
    location: row.location,
    notes: row.notes,
    imageId: row.imageId,
    imageThumbUrl: row.imageR2Key ? thumbUrlFor(row.imageR2Key) : null,
    yarn: row.yarnId
      ? {
          id: row.yarnId,
          name: row.yarnName ?? "",
          slug: row.yarnSlug ?? "",
          weight: row.yarnWeight ?? "dk",
          meters: row.yarnMeters,
          grams: row.yarnGrams,
          brandName: row.brandName ?? "",
          brandSlug: row.brandSlug ?? "",
        }
      : null,
    assignedSkeins: row.assignedSkeins ?? 0,
    assignedGrams: row.assignedGrams ?? 0,
  }));
}

/** Resumen para el hub: cuántas lanas y cuántos ovillos en total. */
export async function countStash(
  userId: string,
): Promise<{ items: number; skeins: number }> {
  const [row] = await getDb()
    .select({
      items: count(),
      skeins: sql<number>`coalesce(sum(${stashItem.skeins}), 0)::int`,
    })
    .from(stashItem)
    .where(eq(stashItem.userId, userId));

  return { items: row?.items ?? 0, skeins: row?.skeins ?? 0 };
}

/** Una lana propia con su foto (para editar o borrar): autorización acá. */
export async function getOwnStashItem(
  userId: string,
  itemId: string,
): Promise<(StashItem & { imageR2Key: string | null }) | null> {
  const rows = await getDb()
    .select({ item: stashItem, imageR2Key: image.r2Key })
    .from(stashItem)
    .leftJoin(image, eq(stashItem.imageId, image.id))
    .where(and(eq(stashItem.id, itemId), eq(stashItem.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }
  return { ...row.item, imageR2Key: row.imageR2Key };
}

export type ProjectYarnItem = {
  id: string;
  stashItemId: string | null;
  yarnId: string | null;
  skeinsUsed: number | null;
  gramsUsed: number | null;
  /** Cómo se muestra: el nombre propio o el de la lana del catálogo. */
  name: string;
  brandName: string | null;
  colorway: string | null;
  weight: YarnWeight | null;
  /** `true` = sale del inventario (descuenta disponible); `false`, del catálogo. */
  fromStash: boolean;
};

/**
 * Las lanas de un proyecto (spec §5.3), en el orden en que se cargaron. Cada
 * fila sale del inventario (y entonces descuenta disponible) o del catálogo
 * (solo referencia); los alias resuelven las dos mitades en una sola consulta.
 */
export async function listProjectYarns(
  projectId: string,
): Promise<ProjectYarnItem[]> {
  const stashYarn = alias(yarn, "stash_yarn");
  const stashBrand = alias(yarnBrand, "stash_brand");
  const catalogYarn = alias(yarn, "catalog_yarn");
  const catalogBrand = alias(yarnBrand, "catalog_brand");

  const rows = await getDb()
    .select({
      id: projectYarn.id,
      stashItemId: projectYarn.stashItemId,
      yarnId: projectYarn.yarnId,
      skeinsUsed: projectYarn.skeinsUsed,
      gramsUsed: projectYarn.gramsUsed,
      stashCustomName: stashItem.customName,
      stashColorway: stashItem.colorway,
      stashWeight: stashItem.weight,
      stashYarnName: stashYarn.name,
      stashYarnWeight: stashYarn.weight,
      stashBrandName: stashBrand.name,
      catalogYarnName: catalogYarn.name,
      catalogYarnWeight: catalogYarn.weight,
      catalogBrandName: catalogBrand.name,
    })
    .from(projectYarn)
    .leftJoin(stashItem, eq(projectYarn.stashItemId, stashItem.id))
    .leftJoin(stashYarn, eq(stashItem.yarnId, stashYarn.id))
    .leftJoin(stashBrand, eq(stashYarn.brandId, stashBrand.id))
    .leftJoin(catalogYarn, eq(projectYarn.yarnId, catalogYarn.id))
    .leftJoin(catalogBrand, eq(catalogYarn.brandId, catalogBrand.id))
    .where(eq(projectYarn.projectId, projectId))
    .orderBy(asc(projectYarn.createdAt), asc(projectYarn.id));

  return rows.map((row) => {
    const fromStash = row.stashItemId !== null;
    return {
      id: row.id,
      stashItemId: row.stashItemId,
      yarnId: row.yarnId,
      skeinsUsed: row.skeinsUsed,
      gramsUsed: row.gramsUsed,
      name: fromStash
        ? (row.stashCustomName ?? row.stashYarnName ?? "")
        : (row.catalogYarnName ?? ""),
      brandName: fromStash ? row.stashBrandName : row.catalogBrandName,
      colorway: fromStash ? row.stashColorway : null,
      weight: fromStash
        ? (row.stashYarnWeight ?? row.stashWeight)
        : row.catalogYarnWeight,
      fromStash,
    };
  });
}

/** Una lana asignada propia: autorización a través de su proyecto. */
export async function getOwnProjectYarn(
  userId: string,
  linkId: string,
): Promise<{ id: string; projectId: string } | null> {
  const rows = await getDb()
    .select({ id: projectYarn.id, projectId: projectYarn.projectId })
    .from(projectYarn)
    .innerJoin(project, eq(projectYarn.projectId, project.id))
    .where(
      and(
        eq(projectYarn.id, linkId),
        eq(project.userId, userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
