import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isPatternCategory } from "@/db/pattern-schema";
import { isYarnWeight } from "@/db/yarn-schema";
import { isCraft } from "@/features/profile/constants";
import { PatternCard } from "@/features/pattern/components/pattern-card";
import {
  PatternFilters,
  type PatternFilterValues,
} from "@/features/pattern/components/pattern-filters";
import {
  isPatternOrder,
  parseDifficulty,
  parseLanguage,
  parseYardageBucket,
} from "@/features/pattern/params";
import { listPatterns } from "@/features/pattern/queries";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: `${es.patterns.title} · ${es.explore.title}`,
};

/**
 * Biblioteca pública de patrones (spec §5.5, `/explorar/patrones`).
 *
 * Los filtros viven en la URL, así que el contenido depende de la petición y
 * se arma dentro del límite de `Suspense`: el encabezado (y el botón de
 * sumar un patrón) viajan en el caparazón estático. Los datos salen del
 * caché compartido de `listPatterns`.
 */

type Props = PageProps<"/explorar/patrones">;

/** Primer valor del parámetro (los filtros no son multiselección). */
function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default function PatternsPage({ searchParams }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {es.patterns.title}
          </h1>
          <p className="text-muted-foreground text-sm">{es.patterns.intro}</p>
        </div>
        <Button asChild>
          <Link href="/explorar/patrones/proponer">
            {es.patterns.proposeCta}
          </Link>
        </Button>
      </div>

      <Suspense fallback={<PatternsSkeleton />}>
        <PatternsContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function PatternsContent({ searchParams }: Pick<Props, "searchParams">) {
  const params = await searchParams;

  // Lo que llega por URL se valida contra el vocabulario real: un valor raro
  // no rompe nada, simplemente no filtra.
  const rawCraft = readParam(params.tecnica);
  const rawCategory = readParam(params.categoria);
  const rawDifficulty = readParam(params.dificultad);
  const rawWeight = readParam(params.grosor);
  const rawLanguage = readParam(params.idioma);
  const rawYardage = readParam(params.metraje);
  const rawOrder = readParam(params.orden);

  const current: PatternFilterValues = {
    q: readParam(params.q).slice(0, 80),
    craft: isCraft(rawCraft) ? rawCraft : "",
    category: isPatternCategory(rawCategory) ? rawCategory : "",
    difficulty: parseDifficulty(rawDifficulty) !== null ? rawDifficulty : "",
    weight: isYarnWeight(rawWeight) ? rawWeight : "",
    language: parseLanguage(rawLanguage) ?? "",
    yardage: parseYardageBucket(rawYardage) ?? "",
    order: isPatternOrder(rawOrder) ? rawOrder : "",
  };

  const patterns = await listPatterns({
    q: current.q,
    craft: current.craft,
    category: current.category,
    difficulty: current.difficulty,
    weight: current.weight,
    language: current.language,
    yardage: current.yardage,
    order: current.order,
  });

  const hasFilters =
    current.q.length > 0 ||
    current.craft.length > 0 ||
    current.category.length > 0 ||
    current.difficulty.length > 0 ||
    current.weight.length > 0 ||
    current.language.length > 0 ||
    current.yardage.length > 0;

  return (
    <>
      <PatternFilters current={current} />

      {patterns.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={BookOpen}
            title={es.patterns.emptyTitle}
            body={es.patterns.emptyBody}
            action={
              <Button asChild>
                <Link href="/explorar/patrones">{es.patterns.emptyCta}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={BookOpen}
            title={es.patterns.firstTitle}
            body={es.patterns.firstBody}
            action={
              <Button asChild>
                <Link href="/explorar/patrones/proponer">
                  {es.patterns.proposeCta}
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <p
            className="text-muted-foreground text-sm"
            data-testid="patterns-count"
          >
            {patterns.length === 1
              ? es.patterns.resultsOne
              : es.patterns.resultsMany.replace(
                  "{count}",
                  String(patterns.length),
                )}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {patterns.map((item) => (
              <PatternCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** Mientras llegan los resultados: la forma de los filtros y de la grilla. */
function PatternsSkeleton() {
  return (
    <div className="flex flex-col gap-4" data-testid="patterns-loading">
      <Skeleton className="h-11 w-full" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
