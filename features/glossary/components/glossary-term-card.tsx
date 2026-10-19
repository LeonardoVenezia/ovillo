import { Badge } from "@/components/ui/badge";
import { es } from "@/messages/es";

import type { GlossaryTermView } from "../queries";

const craftLabels: Record<string, string> = {
  "dos-agujas": es.glossary.filterDosAgujas,
  crochet: es.glossary.filterCrochet,
};

/**
 * Ficha de un término del glosario (spec §5.14): nombre, abreviatura de los
 * patrones, equivalente en inglés, definición en simple y variantes por país.
 */
export function GlossaryTermCard({ term }: { term: GlossaryTermView }) {
  return (
    <article
      id={term.slug}
      data-testid="glossary-term"
      className="border-border bg-card flex scroll-mt-24 flex-col gap-2 rounded-2xl border p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-lg font-semibold">{term.term}</h3>
        {term.abbreviation ? (
          <Badge variant="secondary" data-testid="glossary-abbreviation">
            {es.glossary.abbreviationLabel}: {term.abbreviation}
          </Badge>
        ) : null}
        {term.craft !== "ambos" ? (
          <Badge variant="outline">{craftLabels[term.craft]}</Badge>
        ) : null}
      </div>

      {term.english ? (
        <p className="text-muted-foreground text-sm">
          {es.glossary.englishLabel}: {term.english}
        </p>
      ) : null}

      <p className="text-sm">{term.definition}</p>

      {term.variants.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {es.glossary.variantsLabel}:
          </span>
          {term.variants.map((variant) => (
            <Badge
              key={`${variant.country}-${variant.name}`}
              variant="outline"
              data-testid="glossary-variant"
            >
              {es.glossary.variantChip
                .replace("{country}", variant.country)
                .replace("{name}", variant.name)}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}
