import type { Metadata } from "next";
import { Package } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isYarnFiber, isYarnWeight } from "@/db/yarn-schema";
import { isCountryCode } from "@/features/profile/countries";
import { YarnCard } from "@/features/yarn/components/yarn-card";
import {
  YarnFilters,
  type YarnFilterValues,
} from "@/features/yarn/components/yarn-filters";
import { listBrands, listYarns } from "@/features/yarn/queries";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: `${es.yarns.title} · ${es.explore.title}`,
};

/**
 * Catálogo público de lanas (spec §5.6, `/explorar/lanas`).
 *
 * Los filtros viven en la URL, así que el contenido depende de la petición y
 * se arma dentro del límite de `Suspense`: el encabezado (y el botón de
 * proponer) viajan en el caparazón estático. Los datos salen del caché
 * compartido de `listYarns`.
 */

type Props = PageProps<"/explorar/lanas">;

/** Primer valor del parámetro (los filtros no son multiselección). */
function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default function YarnsPage({ searchParams }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {es.yarns.title}
          </h1>
          <p className="text-muted-foreground text-sm">{es.yarns.intro}</p>
        </div>
        <Button asChild>
          <Link href="/explorar/lanas/proponer">{es.yarns.proposeCta}</Link>
        </Button>
      </div>

      <Suspense fallback={<YarnsSkeleton />}>
        <YarnsContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function YarnsContent({ searchParams }: Pick<Props, "searchParams">) {
  const params = await searchParams;
  const brands = await listBrands();

  // Lo que llega por URL se valida contra el vocabulario real: un valor raro
  // no rompe nada, simplemente no filtra.
  const rawWeight = readParam(params.grosor);
  const rawFiber = readParam(params.fibra);
  const rawBrand = readParam(params.marca);
  const rawCountry = readParam(params.pais);

  const current: YarnFilterValues = {
    q: readParam(params.q).slice(0, 80),
    weight: isYarnWeight(rawWeight) ? rawWeight : "",
    fiber: isYarnFiber(rawFiber) ? rawFiber : "",
    brand: brands.some((brand) => brand.slug === rawBrand) ? rawBrand : "",
    country: isCountryCode(rawCountry) ? rawCountry : "",
  };

  const yarns = await listYarns({
    q: current.q,
    weight: current.weight,
    fiber: current.fiber,
    brand: current.brand,
    country: current.country,
  });

  const hasFilters =
    current.q.length > 0 ||
    current.weight.length > 0 ||
    current.fiber.length > 0 ||
    current.brand.length > 0 ||
    current.country.length > 0;

  return (
    <>
      <YarnFilters brands={brands} current={current} />

      {yarns.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={Package}
            title={es.yarns.emptyTitle}
            body={es.yarns.emptyBody}
            action={
              <Button asChild>
                <Link href="/explorar/lanas">{es.yarns.emptyCta}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Package}
            title={es.yarns.firstTitle}
            body={es.yarns.firstBody}
            action={
              <Button asChild>
                <Link href="/explorar/lanas/proponer">
                  {es.yarns.proposeCta}
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <p
            className="text-muted-foreground text-sm"
            data-testid="yarns-count"
          >
            {yarns.length === 1
              ? es.yarns.resultsOne
              : es.yarns.resultsMany.replace("{count}", String(yarns.length))}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {yarns.map((item) => (
              <YarnCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** Mientras llegan los resultados: la forma de los filtros y de la grilla. */
function YarnsSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-testid="yarns-loading">
      <Skeleton className="h-11 w-full" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-28 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
