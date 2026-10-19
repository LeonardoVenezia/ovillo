import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { user } from "@/db/auth-schema";
import { pattern } from "@/db/pattern-schema";
import type { ProfileVisibility } from "@/db/profile-schema";
import { project } from "@/db/project-schema";
import { collection, savedItem, type SavedType } from "@/db/saved-schema";
import { yarn, yarnBrand } from "@/db/yarn-schema";
import { categoryLabel, craftLabel } from "@/features/pattern/format";
import { weightLabel } from "@/features/yarn/format";
import { es } from "@/messages/es";

/**
 * Consultas de guardados y colecciones (spec §5.8, D-052).
 *
 * `saved_item` es polimórfico, así que primero se leen los guardados y después
 * se resuelven los destinos por tipo en tres consultas en lote. Los destinos
 * que ya no existen (o que dejaron de ser visibles) se descartan al armar la
 * lista: nunca se muestra un guardado roto.
 *
 * Todo es privado y se lee al momento, salvo `listPublicCollections`, que
 * alimenta la sección pública del perfil.
 */

/** Clave del mapa de destinos resueltos. */
function targetKey(type: SavedType, id: string): string {
  return `${type}:${id}`;
}

export type SavedTarget = {
  type: SavedType;
  id: string;
  label: string;
  /** Línea secundaria ya armada por la consulta (diseñador, marca, estado). */
  subtitle: string | null;
  href: string;
  /** Las lanas y los patrones son públicos; los proyectos dependen de ellos. */
  isPublic: boolean;
};

export type SavedEntry = {
  id: string;
  collectionId: string | null;
  target: SavedTarget;
};

export type CollectionSummary = {
  id: string;
  name: string;
  visibility: ProfileVisibility;
  count: number;
};

/**
 * Resuelve en lote los destinos guardados. Los proyectos borrados y los que
 * ya no son visibles quedan afuera del mapa (sus guardados se descartan).
 */
async function resolveTargets(
  pairs: { type: SavedType; id: string }[],
): Promise<Map<string, SavedTarget>> {
  const resolved = new Map<string, SavedTarget>();
  if (pairs.length === 0) {
    return resolved;
  }

  const db = getDb();
  const idsOf = (type: SavedType) => [
    ...new Set(
      pairs.filter((pair) => pair.type === type).map((pair) => pair.id),
    ),
  ];
  const patternIds = idsOf("patron");
  const projectIds = idsOf("proyecto");
  const yarnIds = idsOf("lana");

  const [patterns, projects, yarns] = await Promise.all([
    patternIds.length > 0
      ? db
          .select({
            id: pattern.id,
            slug: pattern.slug,
            name: pattern.name,
            designerName: pattern.designerName,
            craft: pattern.craft,
            category: pattern.category,
          })
          .from(pattern)
          .where(inArray(pattern.id, patternIds))
      : [],
    projectIds.length > 0
      ? db
          .select({
            id: project.id,
            slug: project.slug,
            name: project.name,
            status: project.status,
            visibility: project.visibility,
            username: user.username,
          })
          .from(project)
          .innerJoin(user, eq(project.userId, user.id))
          .where(
            and(inArray(project.id, projectIds), isNull(project.deletedAt)),
          )
      : [],
    yarnIds.length > 0
      ? db
          .select({
            id: yarn.id,
            slug: yarn.slug,
            name: yarn.name,
            weight: yarn.weight,
            brandName: yarnBrand.name,
            brandSlug: yarnBrand.slug,
          })
          .from(yarn)
          .innerJoin(yarnBrand, eq(yarn.brandId, yarnBrand.id))
          .where(inArray(yarn.id, yarnIds))
      : [],
  ]);

  for (const row of patterns) {
    resolved.set(targetKey("patron", row.id), {
      type: "patron",
      id: row.id,
      label: row.name,
      subtitle:
        [
          row.designerName,
          row.craft ? craftLabel(row.craft) : null,
          categoryLabel(row.category),
        ]
          .filter(Boolean)
          .join(" · ") || null,
      href: `/patrones/${row.slug}`,
      isPublic: true,
    });
  }

  for (const row of projects) {
    // Sin `@usuario` no hay URL pública que armar: no se muestra el guardado.
    if (!row.username) {
      continue;
    }
    const isPublic = row.visibility === "publico";
    resolved.set(targetKey("proyecto", row.id), {
      type: "proyecto",
      id: row.id,
      label: row.name,
      subtitle: es.projects.statusLabels[row.status],
      // Un proyecto privado solo lo puede guardar su dueño/a: enlace interno.
      href: isPublic
        ? `/@${row.username}/proyectos/${row.slug}`
        : `/mi-tejido/proyectos/${row.slug}`,
      isPublic,
    });
  }

  for (const row of yarns) {
    resolved.set(targetKey("lana", row.id), {
      type: "lana",
      id: row.id,
      label: `${row.name} · ${row.brandName}`,
      subtitle: row.weight ? weightLabel(row.weight) : null,
      href: `/lanas/${row.brandSlug}/${row.slug}`,
      isPublic: true,
    });
  }

  return resolved;
}

/** Los guardados de una persona con sus colecciones (dueña/o de la sesión). */
export async function listSaved(userId: string): Promise<{
  items: SavedEntry[];
  collections: CollectionSummary[];
}> {
  const db = getDb();
  const [collectionRows, savedRows] = await Promise.all([
    db
      .select({
        id: collection.id,
        name: collection.name,
        visibility: collection.visibility,
      })
      .from(collection)
      .where(eq(collection.userId, userId))
      .orderBy(asc(collection.createdAt)),
    db
      .select({
        id: savedItem.id,
        collectionId: savedItem.collectionId,
        targetType: savedItem.targetType,
        targetId: savedItem.targetId,
      })
      .from(savedItem)
      .where(eq(savedItem.userId, userId))
      .orderBy(desc(savedItem.createdAt)),
  ]);

  const targets = await resolveTargets(
    savedRows.map((row) => ({ type: row.targetType, id: row.targetId })),
  );

  const items: SavedEntry[] = [];
  for (const row of savedRows) {
    const target = targets.get(targetKey(row.targetType, row.targetId));
    if (target) {
      items.push({ id: row.id, collectionId: row.collectionId, target });
    }
  }

  const collections = collectionRows.map((row) => ({
    ...row,
    count: items.filter((item) => item.collectionId === row.id).length,
  }));

  return { items, collections };
}

/** El guardado de ese destino, si existe (botón de las fichas). */
export async function getSavedItem(
  userId: string,
  type: SavedType,
  targetId: string,
): Promise<{ id: string } | null> {
  const [row] = await getDb()
    .select({ id: savedItem.id })
    .from(savedItem)
    .where(
      and(
        eq(savedItem.userId, userId),
        eq(savedItem.targetType, type),
        eq(savedItem.targetId, targetId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Cuántas cosas tiene guardadas (resumen del hub). */
export async function countSaved(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(savedItem)
    .where(eq(savedItem.userId, userId));
  return row?.value ?? 0;
}

export type PublicCollection = {
  id: string;
  name: string;
  items: SavedTarget[];
};

/**
 * Las colecciones públicas de una persona con sus destinos públicos: lo que
 * ve cualquier visitante en el perfil. Los proyectos guardados solo aparecen
 * si siguen siendo públicos; las colecciones que quedan vacías se esconden.
 */
export async function listPublicCollections(
  userId: string,
): Promise<PublicCollection[]> {
  const db = getDb();
  const collectionRows = await db
    .select({ id: collection.id, name: collection.name })
    .from(collection)
    .where(
      and(eq(collection.userId, userId), eq(collection.visibility, "publico")),
    )
    .orderBy(asc(collection.createdAt));

  if (collectionRows.length === 0) {
    return [];
  }

  const savedRows = await db
    .select({
      id: savedItem.id,
      collectionId: savedItem.collectionId,
      targetType: savedItem.targetType,
      targetId: savedItem.targetId,
    })
    .from(savedItem)
    .where(
      and(
        eq(savedItem.userId, userId),
        inArray(
          savedItem.collectionId,
          collectionRows.map((row) => row.id),
        ),
      ),
    )
    .orderBy(asc(savedItem.createdAt));

  const targets = await resolveTargets(
    savedRows.map((row) => ({ type: row.targetType, id: row.targetId })),
  );

  return collectionRows
    .map((row) => ({
      id: row.id,
      name: row.name,
      items: savedRows
        .filter((item) => item.collectionId === row.id)
        .map((item) => targets.get(targetKey(item.targetType, item.targetId)))
        .filter((target): target is SavedTarget => Boolean(target?.isPublic)),
    }))
    .filter((entry) => entry.items.length > 0);
}
