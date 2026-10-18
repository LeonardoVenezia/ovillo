"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PATTERN_CATEGORIES } from "@/db/pattern-schema";
import { YARN_WEIGHTS } from "@/db/yarn-schema";
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
import { selectStyles } from "./select-styles";

/**
 * Filtros de la biblioteca de patrones (spec §5.5): búsqueda por nombre o
 * diseñador/a, técnica, categoría, dificultad y grosor sugerido. Viven en la
 * URL para poder compartir o volver a un resultado; la búsqueda se espera un
 * momentito antes de navegar.
 */

export type PatternFilterValues = {
  q: string;
  craft: string;
  category: string;
  difficulty: string;
  weight: string;
};

/** Nombres de los parámetros en la URL (en castellano, como las rutas). */
const PARAM_NAMES: Record<keyof PatternFilterValues, string> = {
  q: "q",
  craft: "tecnica",
  category: "categoria",
  difficulty: "dificultad",
  weight: "grosor",
};

const DIFFICULTIES = [1, 2, 3, 4, 5] as const;

export function PatternFilters({ current }: { current: PatternFilterValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(current.q);
  const [lastPropQuery, setLastPropQuery] = useState(current.q);
  const [isPending, startTransition] = useTransition();

  // Si la URL cambió por fuera (atrás/adelante en el navegador), el texto del
  // buscador se alinea con lo que muestra la URL. Es el ajuste de estado en
  // render que recomienda React para props que cambian.
  if (current.q !== lastPropQuery) {
    setLastPropQuery(current.q);
    setQuery(current.q);
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
    current.weight.length > 0;

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
