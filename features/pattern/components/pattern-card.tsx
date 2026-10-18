import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { weightLabel } from "@/features/yarn/format";
import { es } from "@/messages/es";

import { categoryLabel, craftLabel, difficultyLabel } from "../format";
import type { PatternListItem } from "../queries";

/**
 * Tarjeta de patrón para el listado (spec §5.5): nombre, diseñador/a,
 * técnica, categoría y lo que ayuda a decidir (dificultad y grosor). Los
 * `sin-revisar` se marcan acá.
 */
export function PatternCard({ item }: { item: PatternListItem }) {
  const meta = [
    item.difficulty !== null ? difficultyLabel(item.difficulty) : null,
    item.yarnWeight ? weightLabel(item.yarnWeight) : null,
    item.projectCount > 0
      ? item.projectCount === 1
        ? es.patterns.madeOne
        : es.patterns.madeMany.replace("{count}", String(item.projectCount))
      : null,
  ]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(" · ");

  return (
    <Link
      href={`/patrones/${item.slug}`}
      data-testid="pattern-card"
      className="border-border bg-card hover:bg-muted/40 focus-visible:outline-ring flex flex-col gap-2 rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex items-start justify-between gap-2">
        {item.designerName ? (
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {item.designerName}
          </span>
        ) : (
          <span />
        )}
        {item.status === "sin-revisar" ? (
          <Badge variant="outline">{es.patterns.statusUnreviewed}</Badge>
        ) : null}
      </span>

      <span className="leading-snug font-medium">{item.name}</span>

      <span className="flex flex-wrap gap-1.5">
        {item.craft ? (
          <Badge variant="secondary">{craftLabel(item.craft)}</Badge>
        ) : null}
        <Badge variant="secondary">{categoryLabel(item.category)}</Badge>
      </span>

      {meta.length > 0 ? (
        <span className="text-muted-foreground text-sm">{meta}</span>
      ) : null}
    </Link>
  );
}
