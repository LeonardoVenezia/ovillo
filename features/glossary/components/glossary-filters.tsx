"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { GLOSSARY_FILTER_CRAFTS, type GlossaryFilterCraft } from "../schemas";

/**
 * Filtros del glosario (spec §5.14): búsqueda y técnica, en la URL (`?q=` y
 * `?tecnica=`) para poder compartir el resultado.
 */
export function GlossaryFilters({
  q,
  craft,
}: {
  q: string;
  craft: GlossaryFilterCraft | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [term, setTerm] = useState(q);

  function apply(nextTerm: string, nextCraft: GlossaryFilterCraft | null) {
    const params = new URLSearchParams();
    const clean = nextTerm.trim();
    if (clean) {
      params.set("q", clean);
    }
    if (nextCraft) {
      params.set("tecnica", nextCraft);
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
          apply(term, craft);
        }}
        className="flex gap-2"
      >
        <Input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={es.glossary.searchPlaceholder}
          aria-label={es.glossary.searchLabel}
          data-testid="glossary-search"
        />
        <Button
          type="submit"
          variant="outline"
          data-testid="glossary-search-submit"
        >
          <Search aria-hidden />
          {es.glossary.searchCta}
        </Button>
      </form>

      <div
        role="group"
        aria-label={es.glossary.title}
        className="flex flex-wrap gap-2"
      >
        <button
          type="button"
          aria-pressed={craft === null}
          data-testid="glossary-filter-todas"
          className={cn(chipStyles, craft === null ? chipSelected : chipIdle)}
          onClick={() => apply(term, null)}
        >
          {es.glossary.filterAll}
        </button>
        {GLOSSARY_FILTER_CRAFTS.map((value) => {
          const selected = craft === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              data-testid={`glossary-filter-${value}`}
              className={cn(chipStyles, selected ? chipSelected : chipIdle)}
              onClick={() => apply(term, value)}
            >
              {value === "dos-agujas"
                ? es.glossary.filterDosAgujas
                : es.glossary.filterCrochet}
            </button>
          );
        })}
      </div>
    </div>
  );
}
