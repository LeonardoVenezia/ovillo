"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROUP_CATEGORIES, type GroupCategory } from "@/db/community-schema";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

/**
 * Filtros del directorio de grupos (spec §5.9): búsqueda por nombre o
 * descripción y categoría. Viven en la URL (`?q=` y `?categoria=`) para poder
 * compartir el resultado.
 */
export function GroupFilters({
  q,
  category,
}: {
  q: string;
  category: GroupCategory | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [term, setTerm] = useState(q);

  function apply(nextTerm: string, nextCategory: GroupCategory | null) {
    const params = new URLSearchParams();
    const clean = nextTerm.trim();
    if (clean) {
      params.set("q", clean);
    }
    if (nextCategory) {
      params.set("categoria", nextCategory);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          apply(term, category);
        }}
        className="flex gap-2"
      >
        <Input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={es.community.searchPlaceholder}
          aria-label={es.community.searchLabel}
          data-testid="group-search"
        />
        <Button
          type="submit"
          variant="outline"
          data-testid="group-search-submit"
        >
          <Search aria-hidden />
          {es.community.searchCta}
        </Button>
      </form>

      <div
        role="group"
        aria-label={es.community.categoryFilterLabel}
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          aria-pressed={category === null}
          className={cn(
            chipStyles,
            category === null ? chipSelected : chipIdle,
          )}
          onClick={() => apply(term, null)}
        >
          {es.community.filterAll}
        </button>
        {GROUP_CATEGORIES.map((value) => {
          const selected = category === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              className={cn(chipStyles, selected ? chipSelected : chipIdle)}
              onClick={() => apply(term, value)}
            >
              {es.community.categories[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
