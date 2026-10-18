"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { YARN_FIBERS, YARN_WEIGHTS } from "@/db/yarn-schema";
import { COUNTRY_NAMES } from "@/features/profile/countries";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { fiberLabel, weightLabel } from "../format";
import type { YarnBrandOption } from "../queries";
import { selectStyles } from "@/components/select-styles";

/**
 * Filtros del catálogo de lanas (spec §5.6): búsqueda por nombre o marca,
 * grosor, fibra, marca y país. Viven en la URL para poder compartir o volver
 * a un resultado; la búsqueda se espera un momentito antes de navegar.
 */

export type YarnFilterValues = {
  q: string;
  weight: string;
  fiber: string;
  brand: string;
  country: string;
};

/** Nombres de los parámetros en la URL (en castellano, como las rutas). */
const PARAM_NAMES: Record<keyof YarnFilterValues, string> = {
  q: "q",
  weight: "grosor",
  fiber: "fibra",
  brand: "marca",
  country: "pais",
};

export function YarnFilters({
  brands,
  current,
}: {
  brands: YarnBrandOption[];
  current: YarnFilterValues;
}) {
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
    (next: Partial<YarnFilterValues>) => {
      const merged = { ...currentRef.current, ...next };
      const params = new URLSearchParams();
      for (const key of Object.keys(
        PARAM_NAMES,
      ) as (keyof YarnFilterValues)[]) {
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

  const countries = Array.from(
    new Set(
      brands
        .map((brand) => brand.country)
        .filter((code): code is NonNullable<typeof code> => code !== null),
    ),
  ).sort((a, b) => COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b], "es"));

  const hasFilters =
    current.q.length > 0 ||
    current.weight.length > 0 ||
    current.fiber.length > 0 ||
    current.brand.length > 0 ||
    current.country.length > 0;

  return (
    <div
      className="flex flex-col gap-4"
      data-testid="yarn-filters"
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
          placeholder={es.yarns.searchPlaceholder}
          aria-label={es.yarns.searchLabel}
          enterKeyHint="search"
          data-testid="yarn-search"
          className="h-11 pl-9 text-base md:text-sm"
        />
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={es.yarns.weightFilterLabel}
      >
        <FilterChip
          label={es.yarns.filterAll}
          active={current.weight === ""}
          testId="yarn-filter-grosor-todas"
          onClick={() => apply({ weight: "" })}
        />
        {YARN_WEIGHTS.map((weight) => (
          <FilterChip
            key={weight}
            label={weightLabel(weight)}
            active={current.weight === weight}
            testId={`yarn-filter-grosor-${weight}`}
            onClick={() =>
              apply({ weight: current.weight === weight ? "" : weight })
            }
          />
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <select
          value={current.brand}
          onChange={(event) => apply({ brand: event.target.value })}
          aria-label={es.yarns.brandFilterLabel}
          data-testid="yarn-filter-marca"
          className={selectStyles}
        >
          <option value="">{es.yarns.brandFilterAll}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>

        <select
          value={current.fiber}
          onChange={(event) => apply({ fiber: event.target.value })}
          aria-label={es.yarns.fiberFilterLabel}
          data-testid="yarn-filter-fibra"
          className={selectStyles}
        >
          <option value="">{es.yarns.fiberFilterAll}</option>
          {YARN_FIBERS.map((fiber) => (
            <option key={fiber} value={fiber}>
              {fiberLabel(fiber)}
            </option>
          ))}
        </select>

        <select
          value={current.country}
          onChange={(event) => apply({ country: event.target.value })}
          aria-label={es.yarns.countryFilterLabel}
          data-testid="yarn-filter-pais"
          className={selectStyles}
        >
          <option value="">{es.yarns.countryFilterAll}</option>
          {countries.map((code) => (
            <option key={code} value={code}>
              {COUNTRY_NAMES[code]}
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
            data-testid="yarn-clear-filters"
            onClick={() => {
              setQuery("");
              apply({ q: "", weight: "", fiber: "", brand: "", country: "" });
            }}
          >
            {es.yarns.clearFilters}
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
