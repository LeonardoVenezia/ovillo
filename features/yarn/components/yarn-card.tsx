import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { countryName } from "@/features/profile/countries";
import { es } from "@/messages/es";

import {
  formatComposition,
  formatNeedles,
  formatSkein,
  weightLabel,
} from "../format";
import type { YarnListItem } from "../queries";

/**
 * Tarjeta de lana para el listado (spec §5.6): marca, nombre, grosor,
 * composición y datos del ovillo. Las `sin-revisar` se marcan acá.
 */
export function YarnCard({ item }: { item: YarnListItem }) {
  const country = item.brandCountry ? countryName(item.brandCountry) : null;
  const composition = formatComposition(item.fiber);
  const skein = formatSkein(item.grams, item.meters);
  const needles = formatNeedles(item.needleMmMin, item.needleMmMax);
  const meta = [skein, needles ? `${es.yarns.detail.needles} ${needles}` : null]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <Link
      href={`/lanas/${item.brandSlug}/${item.slug}`}
      data-testid="yarn-card"
      className="border-border bg-card hover:bg-muted/40 focus-visible:outline-ring flex flex-col gap-2 rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {item.brandName}
          {country ? ` · ${country}` : ""}
        </span>
        {item.status === "sin-revisar" ? (
          <Badge variant="outline">{es.yarns.statusUnreviewed}</Badge>
        ) : null}
      </span>

      <span className="leading-snug font-medium">{item.name}</span>

      <span className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{weightLabel(item.weight)}</Badge>
      </span>

      <span className="text-muted-foreground text-sm">{composition}</span>
      {meta.length > 0 ? (
        <span className="text-muted-foreground text-sm">{meta}</span>
      ) : null}
    </Link>
  );
}
