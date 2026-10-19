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
import {
  listPatterns,
  listPatternsForStash,
  type PatternListItem,
} from "@/features/pattern/queries";
import { listStashItems } from "@/features/stash/queries";
import {
  stashStockFromItems,
  type StashStockEntry,
} from "@/features/stash/stock";
import { getOptionalUser } from "@/lib/session";
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
 * caché compartido de `listPatterns`, salvo "Con mi lana" (spec §5.6), que
 * cruza el inventario de quien mira: dato privado y sin caché.
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
  const wantsStash = readParam(params.lana) === "mia";

  const current: PatternFilterValues = {
    q: readParam(params.q).slice(0, 80),
    craft: isCraft(rawCraft) ? rawCraft : "",
    category: isPatternCategory(rawCategory) ? rawCategory : "",
    difficulty: parseDifficulty(rawDifficulty) !== null ? rawDifficulty : "",
    weight: isYarnWeight(rawWeight) ? rawWeight : "",
    language: parseLanguage(rawLanguage) ?? "",
    yardage: parseYardageBucket(rawYardage) ?? "",
    order: isPatternOrder(rawOrder) ? rawOrder : "",
    lana: wantsStash ? "mia" : "",
  };

  const filters = {
    q: current.q,
    craft: current.craft,
    category: current.category,
    difficulty: current.difficulty,
    weight: current.weight,
    language: current.language,
    yardage: current.yardage,
    order: current.order,
  };

  // La sesión se lee siempre (el chip "Con mi lana" la necesita para saber si
  // llevar al ingreso); el inventario, solo cuando el filtro está activo.
  const viewer = await getOptionalUser();

  let stashStock: StashStockEntry[] = [];
  let patterns: PatternListItem[];
  if (wantsStash) {
    if (viewer) {
      stashStock = stashStockFromItems(await listStashItems(viewer.id));
      patterns = await listPatternsForStash(stashStock, filters);
    } else {
      patterns = [];
    }
  } else {
    patterns = await listPatterns(filters);
  }

  const hasFilters =
    current.q.length > 0 ||
    current.craft.length > 0 ||
    current.category.length > 0 ||
    current.difficulty.length > 0 ||
    current.weight.length > 0 ||
    current.language.length > 0 ||
    current.yardage.length > 0 ||
    current.lana.length > 0;

  return (
    <>
      <PatternFilters current={current} signedIn={viewer !== null} />

      {patterns.length === 0 ? (
        wantsStash ? (
          <StashEmptyState
            signedIn={viewer !== null}
            hasStock={stashStock.length > 0}
          />
        ) : hasFilters ? (
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

/** Vacíos de "Con mi lana": sin sesión, sin stock o sin cruce posible. */
function StashEmptyState({
  signedIn,
  hasStock,
}: {
  signedIn: boolean;
  hasStock: boolean;
}) {
  if (!signedIn) {
    return (
      <EmptyState
        icon={BookOpen}
        title={es.patterns.stashSignInTitle}
        body={es.patterns.stashSignInBody}
        action={
          <Button asChild>
            <Link
              href={`/ingresar?volver=${encodeURIComponent(
                "/explorar/patrones?lana=mia",
              )}`}
            >
              {es.patterns.stashSignInCta}
            </Link>
          </Button>
        }
      />
    );
  }

  if (!hasStock) {
    return (
      <EmptyState
        icon={BookOpen}
        title={es.patterns.stashEmptyTitle}
        body={es.patterns.stashEmptyBody}
        action={
          <Button asChild>
            <Link href="/mi-tejido/lanas">{es.patterns.stashEmptyCta}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={BookOpen}
      title={es.patterns.stashNoMatchTitle}
      body={es.patterns.stashNoMatchBody}
      action={
        <Button asChild>
          <Link href="/explorar/patrones">{es.patterns.emptyCta}</Link>
        </Button>
      }
    />
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
