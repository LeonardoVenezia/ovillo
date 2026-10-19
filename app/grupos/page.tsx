import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isGroupCategory } from "@/db/community-schema";
import { GroupCard } from "@/features/community/components/group-card";
import { GroupFilters } from "@/features/community/components/group-filters";
import { listGroups } from "@/features/community/queries";
import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.community.directoryTitle,
};

/**
 * Directorio de grupos (spec §5.9, `/grupos`): búsqueda por nombre o
 * descripción, filtro por categoría y el estado de quien mira en cada
 * tarjeta. Los filtros viven en la URL y el contenido se arma al momento
 * dentro del límite de `Suspense` (D-054).
 */

type Props = PageProps<"/grupos">;

/** Primer valor del parámetro (los filtros no son multiselección). */
function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default function GroupsPage({ searchParams }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.community.directoryTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {es.community.directoryIntro}
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <GroupsContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function GroupsContent({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const params = await searchParams;
  const q = readParam(params.q);
  const rawCategory = readParam(params.categoria);
  const category = isGroupCategory(rawCategory) ? rawCategory : null;

  const user = await getOptionalUser();
  const groups = await listGroups({
    viewerId: user?.id,
    q,
    category: category ?? undefined,
  });

  const filtered = q.trim().length > 0 || category !== null;

  return (
    <div className="flex flex-col gap-4">
      <GroupFilters q={q} category={category} />

      {groups.length > 0 ? (
        <>
          <p
            className="text-muted-foreground text-sm"
            data-testid="groups-count"
          >
            {groups.length === 1
              ? es.community.countOne
              : es.community.count.replace("{count}", String(groups.length))}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Users}
          title={filtered ? es.community.emptySearch : es.community.emptyTitle}
          body={
            filtered ? es.community.emptySearchBody : es.community.emptyBody
          }
        />
      )}
    </div>
  );
}
