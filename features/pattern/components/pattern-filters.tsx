"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { selectStyles } from "@/components/select-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PATTERN_CATEGORIES,
  PATTERN_LANGUAGES,
  type PatternCategory,
} from "@/db/pattern-schema";
import { YARN_WEIGHTS, type YarnWeight } from "@/db/yarn-schema";
import { CRAFT_SLUGS } from "@/features/profile/constants";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import { weightLabel } from "@/features/yarn/format";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { categoryLabel, craftLabel, difficultyLabel } from "../format";
import {
  resolvePatternOrder,
  PATTERN_ORDERS,
  type YardageBucket,
} from "../params";

/**
 * Filtros de la biblioteca de patrones (spec §5.5): búsqueda por nombre o
 * diseñador/a; técnica, categoría, dificultad y grosor a la vista; metraje e
 * idioma en el panel avanzado; y el orden (relevancia, populares, recientes).
 * Todo vive en la URL para poder compartir o volver a un resultado, y los
 * filtros activos se resumen en chips que se quitan con un toque.
 */

export type PatternFilterValues = {
  q: string;
  craft: string;
  category: string;
  difficulty: string;
  weight: string;
  language: string;
  yardage: string;
  order: string;
};

/** Nombres de los parámetros en la URL (en castellano, como las rutas). */
const PARAM_NAMES: Record<keyof PatternFilterValues, string> = {
  q: "q",
  craft: "tecnica",
  category: "categoria",
  difficulty: "dificultad",
  weight: "grosor",
  language: "idioma",
  yardage: "metraje",
  order: "orden",
};

const DIFFICULTIES = [1, 2, 3, 4, 5] as const;

const ORDER_LABELS: Record<(typeof PATTERN_ORDERS)[number], string> = {
  relevancia: es.patterns.orderRelevance,
  populares: es.patterns.orderPopular,
  recientes: es.patterns.orderRecent,
};

export function PatternFilters({ current }: { current: PatternFilterValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(current.q);
  const [lastPropQuery, setLastPropQuery] = useState(current.q);
  const [isPending, startTransition] = useTransition();
  const advancedActive =
    current.language.length > 0 || current.yardage.length > 0;
  const [showAdvanced, setShowAdvanced] = useState(advancedActive);
  const [lastAdvancedActive, setLastAdvancedActive] = useState(advancedActive);

  // Si la URL cambió por fuera (atrás/adelante en el navegador), el texto del
  // buscador se alinea con lo que muestra la URL. Es el ajuste de estado en
  // render que recomienda React para props que cambian.
  if (current.q !== lastPropQuery) {
    setLastPropQuery(current.q);
    setQuery(current.q);
  }

  // Un filtro avanzado que llega por URL abre el panel solo, solo la primera
  // vez: si la persona lo cierra, se queda cerrado.
  if (advancedActive && !lastAdvancedActive) {
    setLastAdvancedActive(true);
    setShowAdvanced(true);
  }

  // El valor más reciente de los filtros, para que la búsqueda demorada no
  // pise un filtro que se tocó mientras tanto.
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const apply = useCallback(
    (next: Partial<PatternFilterValues>) => {
      const merged = { ...currentRef.current, ...next };
      const params = new URLSearchParams();
      for (const key of Object.keys(
        PARAM_NAMES,
      ) as (keyof PatternFilterValues)[]) {
        const value = merged[key];
        if (value.length > 0) {
          params.set(PARAM_NAMES[key], value);
        }
      }
      const search = params.toString();
      startTransition(() => {
        router.replace(search.length > 0 ? `${pathname}?${search}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, startTransition],
  );

  // Búsqueda con respiro: navega 350 ms después de la última tecla.
  useEffect(() => {
    if (query === currentRef.current.q) {
      return;
    }
    const timer = setTimeout(() => apply({ q: query }), 350);
    return () => clearTimeout(timer);
  }, [query, apply]);

  const hasFilters =
    current.q.length > 0 ||
    current.craft.length > 0 ||
    current.category.length > 0 ||
    current.difficulty.length > 0 ||
    current.weight.length > 0 ||
    current.language.length > 0 ||
    current.yardage.length > 0;

  // Lo que vive en los selects se resume en chips que se quitan solos: las
  // técnicas ya se ven seleccionadas arriba, así que no se repiten acá.
  const activeChips: { key: keyof PatternFilterValues; label: string }[] = [];
  if (current.category.length > 0) {
    activeChips.push({
      key: "category",
      label: categoryLabel(current.category as PatternCategory),
    });
  }
  if (current.difficulty.length > 0) {
    activeChips.push({
      key: "difficulty",
      label: difficultyLabel(Number(current.difficulty)),
    });
  }
  if (current.weight.length > 0) {
    activeChips.push({
      key: "weight",
      label: weightLabel(current.weight as YarnWeight),
    });
  }
  if (current.language.length > 0) {
    activeChips.push({
      key: "language",
      label:
        es.patterns.languages[
          current.language as keyof typeof es.patterns.languages
        ] ?? current.language,
    });
  }
  if (current.yardage.length > 0) {
    activeChips.push({
      key: "yardage",
      label:
        es.patterns.yardageLabels[current.yardage as YardageBucket] ??
        current.yardage,
    });
  }

  const effectiveOrder = resolvePatternOrder(
    current.order,
    current.q.length > 0,
  );

  return (
    <div
      className="flex flex-col gap-4"
      data-testid="pattern-filters"
      aria-busy={isPending}
    >
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={es.patterns.searchPlaceholder}
          aria-label={es.patterns.searchLabel}
          enterKeyHint="search"
          data-testid="pattern-search"
          className="h-11 pl-9 text-base md:text-sm"
        />
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={es.patterns.craftFilterLabel}
      >
        <FilterChip
          label={es.patterns.craftFilterAll}
          active={current.craft === ""}
          testId="pattern-filter-tecnica-todas"
          onClick={() => apply({ craft: "" })}
        />
        {CRAFT_SLUGS.map((craft) => (
          <FilterChip
            key={craft}
            label={craftLabel(craft)}
            active={current.craft === craft}
            testId={`pattern-filter-tecnica-${craft}`}
            onClick={() =>
              apply({ craft: current.craft === craft ? "" : craft })
            }
          />
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <select
          value={current.category}
          onChange={(event) => apply({ category: event.target.value })}
          aria-label={es.patterns.categoryFilterLabel}
          data-testid="pattern-filter-categoria"
          className={selectStyles}
        >
          <option value="">{es.patterns.categoryFilterAll}</option>
          {PATTERN_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {categoryLabel(category)}
            </option>
          ))}
        </select>

        <select
          value={current.difficulty}
          onChange={(event) => apply({ difficulty: event.target.value })}
          aria-label={es.patterns.difficultyFilterLabel}
          data-testid="pattern-filter-dificultad"
          className={selectStyles}
        >
          <option value="">{es.patterns.difficultyFilterAll}</option>
          {DIFFICULTIES.map((value) => (
            <option key={value} value={String(value)}>
              {difficultyLabel(value)}
            </option>
          ))}
        </select>

        <select
          value={current.weight}
          onChange={(event) => apply({ weight: event.target.value })}
          aria-label={es.patterns.weightFilterLabel}
          data-testid="pattern-filter-grosor"
          className={selectStyles}
        >
          <option value="">{es.patterns.weightFilterAll}</option>
          {YARN_WEIGHTS.map((weight) => (
            <option key={weight} value={weight}>
              {weightLabel(weight)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAdvanced((open) => !open)}
          aria-expanded={showAdvanced}
          data-testid="pattern-more-filters"
        >
          {showAdvanced ? es.patterns.fewerFilters : es.patterns.moreFilters}
          <ChevronDown
            className={cn("transition-transform", showAdvanced && "rotate-180")}
            aria-hidden="true"
          />
        </Button>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {es.patterns.orderLabel}
          </span>
          <select
            value={effectiveOrder}
            onChange={(event) => apply({ order: event.target.value })}
            aria-label={es.patterns.orderLabel}
            data-testid="pattern-order"
            className={cn(selectStyles, "w-auto")}
          >
            {PATTERN_ORDERS.map((order) => (
              <option key={order} value={order}>
                {ORDER_LABELS[order]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showAdvanced ? (
        <div
          className="grid gap-2 sm:grid-cols-2"
          data-testid="pattern-advanced"
        >
          <select
            value={current.yardage}
            onChange={(event) => apply({ yardage: event.target.value })}
            aria-label={es.patterns.yardageFilterLabel}
            data-testid="pattern-filter-metraje"
            className={selectStyles}
          >
            <option value="">{es.patterns.yardageFilterAll}</option>
            {(Object.keys(es.patterns.yardageLabels) as YardageBucket[]).map(
              (bucket) => (
                <option key={bucket} value={bucket}>
                  {es.patterns.yardageLabels[bucket]}
                </option>
              ),
            )}
          </select>

          <select
            value={current.language}
            onChange={(event) => apply({ language: event.target.value })}
            aria-label={es.patterns.languageFilterLabel}
            data-testid="pattern-filter-idioma"
            className={selectStyles}
          >
            <option value="">{es.patterns.languageFilterAll}</option>
            {PATTERN_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {es.patterns.languages[language]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {activeChips.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={es.patterns.activeFiltersLabel}
          data-testid="pattern-active-filters"
        >
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => apply({ [chip.key]: "" })}
              aria-label={`${es.patterns.removeFilter}: ${chip.label}`}
              data-testid={`pattern-active-${chip.key}`}
              className={cn(chipStyles, chipIdle, "gap-1.5")}
            >
              {chip.label}
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      {hasFilters ? (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="pattern-clear-filters"
            onClick={() => {
              setQuery("");
              apply({
                q: "",
                craft: "",
                category: "",
                difficulty: "",
                weight: "",
                language: "",
                yardage: "",
                order: "",
              });
            }}
          >
            {es.patterns.clearFilters}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      data-testid={testId}
      className={cn(chipStyles, active ? chipSelected : chipIdle)}
    >
      {label}
    </button>
  );
}
