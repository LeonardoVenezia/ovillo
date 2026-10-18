import type { Metadata } from "next";
import { Shirt } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isProjectStatus } from "@/db/project-schema";
import { isCraft } from "@/features/profile/constants";
import { CommunityProjectCard } from "@/features/projects/components/community-project-card";
import {
  ExploreProjectsFilters,
  type CommunityFilterValues,
} from "@/features/projects/components/explore-projects-filters";
import { toCommunityProjectItems } from "@/features/projects/community-view";
import {
  COMMUNITY_PAGE_SIZE,
  listCommunityProjects,
} from "@/features/projects/queries";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: `${es.explore.proyectosTitle} · ${es.explore.title}`,
};

/**
 * Galería pública de proyectos (spec §9, `/explorar/proyectos`): lo que la
 * comunidad compartió, con búsqueda y filtros. Los filtros viven en la URL,
 * así que el contenido va dentro de `Suspense` y el encabezado viaja en el
 * caparazón estático. "Ver más" agranda la ventana (`?mostrar=`).
 */

type Props = PageProps<"/explorar/proyectos">;

/** Hasta cuántos proyectos se pueden pedir de una vez con `?mostrar=`. */
const MAX_SHOWN = COMMUNITY_PAGE_SIZE * 20;

/** Primer valor del parámetro (los filtros no son multiselección). */
function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

/** La URL de "Ver más": los mismos filtros con la ventana más grande. */
function moreHref(current: CommunityFilterValues, shown: number): string {
  const params = new URLSearchParams();
  if (current.q.length > 0) {
    params.set("q", current.q);
  }
  if (current.craft.length > 0) {
    params.set("tecnica", current.craft);
  }
  if (current.status.length > 0) {
    params.set("estado", current.status);
  }
  params.set("mostrar", String(shown));
  return `/explorar/proyectos?${params.toString()}`;
}

export default function ExploreProjectsPage({ searchParams }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {es.explore.proyectosTitle}
          </h1>
          <p className="text-muted-foreground text-sm">
            {es.projects.communityIntro}
          </p>
        </div>
        <Button asChild>
          <Link href="/mi-tejido/proyectos/nuevo">
            {es.projects.communityCta}
          </Link>
        </Button>
      </div>

      <Suspense fallback={<ProjectsSkeleton />}>
        <ExploreProjectsContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ExploreProjectsContent({
  searchParams,
}: Pick<Props, "searchParams">) {
  const params = await searchParams;

  // Lo que llega por URL se valida contra el vocabulario real: un valor raro
  // no rompe nada, simplemente no filtra.
  const rawCraft = readParam(params.tecnica);
  const rawStatus = readParam(params.estado);
  const current: CommunityFilterValues = {
    q: readParam(params.q).slice(0, 80),
    craft: isCraft(rawCraft) ? rawCraft : "",
    status: isProjectStatus(rawStatus) ? rawStatus : "",
  };

  const rawShown = Number(readParam(params.mostrar));
  const shown =
    Number.isInteger(rawShown) && rawShown >= COMMUNITY_PAGE_SIZE
      ? Math.min(rawShown, MAX_SHOWN)
      : COMMUNITY_PAGE_SIZE;

  const { items, total } = await listCommunityProjects(current, shown);
  const projects = toCommunityProjectItems(items);

  const hasFilters =
    current.q.length > 0 ||
    current.craft.length > 0 ||
    current.status.length > 0;

  return (
    <>
      <ExploreProjectsFilters current={current} />

      {projects.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={Shirt}
            title={es.projects.communityEmptyTitle}
            body={es.projects.communityEmptyBody}
            action={
              <Button asChild>
                <Link href="/explorar/proyectos">
                  {es.projects.communityClearFilters}
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Shirt}
            title={es.projects.communityFirstTitle}
            body={es.projects.communityFirstBody}
            action={
              <Button asChild>
                <Link href="/mi-tejido/proyectos/nuevo">
                  {es.projects.communityCta}
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <p
            className="text-muted-foreground text-sm"
            data-testid="community-projects-count"
          >
            {total} {total === 1 ? es.projects.countOne : es.projects.countMany}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((item) => (
              <CommunityProjectCard key={item.id} item={item} />
            ))}
          </div>
          {total > projects.length && shown < MAX_SHOWN ? (
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link
                  href={moreHref(current, shown + COMMUNITY_PAGE_SIZE)}
                  data-testid="community-more"
                >
                  {es.projects.showMore}
                </Link>
              </Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

/** Mientras llegan los proyectos: la forma de los filtros y de la grilla. */
function ProjectsSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-testid="community-loading">
      <Skeleton className="h-11 w-full" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
