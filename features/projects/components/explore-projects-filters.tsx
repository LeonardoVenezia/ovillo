"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { selectStyles } from "@/components/select-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROJECT_STATUSES } from "@/db/project-schema";
import { CRAFT_SLUGS } from "@/features/profile/constants";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { chipIdle, chipSelected, chipStyles } from "./chip-styles";

/**
 * Filtros de la galería pública de proyectos (spec §9, `/explorar/proyectos`):
 * búsqueda por nombre, técnica y estado. Viven en la URL para compartir o
 * volver a un resultado; el buscador espera un momentito antes de navegar.
 */

export type CommunityFilterValues = {
  q: string;
  craft: string;
  status: string;
};

/** Nombres de los parámetros en la URL (en castellano, como las rutas). */
const PARAM_NAMES: Record<keyof CommunityFilterValues, string> = {
  q: "q",
  craft: "tecnica",
  status: "estado",
};

export function ExploreProjectsFilters({
  current,
}: {
  current: CommunityFilterValues;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(current.q);
  const [lastPropQuery, setLastPropQuery] = useState(current.q);
  const [isPending, startTransition] = useTransition();

  // Si la URL cambió por fuera (atrás/adelante en el navegador), el texto del
  // buscador se alinea con lo que muestra la URL.
  if (current.q !== lastPropQuery) {
    setLastPropQuery(current.q);
    setQuery(current.q);
  }

  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const apply = useCallback(
    (next: Partial<CommunityFilterValues>) => {
      const merged = { ...currentRef.current, ...next };
      const params = new URLSearchParams();
      for (const key of Object.keys(
        PARAM_NAMES,
      ) as (keyof CommunityFilterValues)[]) {
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
    current.status.length > 0;

  return (
    <div
      className="flex flex-col gap-4"
      data-testid="community-filters"
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
          placeholder={es.projects.communitySearchPlaceholder}
          aria-label={es.projects.communitySearchLabel}
          enterKeyHint="search"
          data-testid="community-search"
          className="h-11 pl-9 text-base md:text-sm"
        />
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={es.projects.communityCraftLabel}
      >
        <FilterChip
          label={es.projects.communityCraftAll}
          active={current.craft === ""}
          testId="community-filter-tecnica-todas"
          onClick={() => apply({ craft: "" })}
        />
        {CRAFT_SLUGS.map((craft) => (
          <FilterChip
            key={craft}
            label={es.profile.craftLabels[craft]}
            active={current.craft === craft}
            testId={`community-filter-tecnica-${craft}`}
            onClick={() =>
              apply({ craft: current.craft === craft ? "" : craft })
            }
          />
        ))}
      </div>

      <select
        value={current.status}
        onChange={(event) => apply({ status: event.target.value })}
        aria-label={es.projects.communityStatusLabel}
        data-testid="community-filter-estado"
        className={selectStyles}
      >
        <option value="">{es.projects.communityStatusAll}</option>
        {PROJECT_STATUSES.map((status) => (
          <option key={status} value={status}>
            {es.projects.statusLabels[status]}
          </option>
        ))}
      </select>

      {hasFilters ? (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="community-clear-filters"
            onClick={() => {
              setQuery("");
              apply({ q: "", craft: "", status: "" });
            }}
          >
            {es.projects.communityClearFilters}
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
