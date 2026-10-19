import { BookMarked } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlossaryFilters } from "@/features/glossary/components/glossary-filters";
import { GlossaryTermCard } from "@/features/glossary/components/glossary-term-card";
import { listGlossaryTerms } from "@/features/glossary/queries";
import {
  filterGlossaryTerms,
  glossaryCountLabel,
  groupGlossaryTerms,
  parseGlossaryCraft,
} from "@/features/glossary/schemas";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.glossary.title,
};

/**
 * Glosario público (spec §5.14, `/glosario`): puntos, técnicas y
 * abreviaturas con variantes por país y su equivalente en inglés. Los
 * términos salen del caché compartido (`listGlossaryTerms`) y la búsqueda y
 * los filtros viven en la URL, dentro del límite de `Suspense`.
 */

type Props = PageProps<"/glosario">;

/** Primer valor del parámetro (los filtros no son multiselección). */
function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default function GlossaryPage({ searchParams }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.glossary.title}
        </h1>
        <p className="text-muted-foreground text-sm">{es.glossary.intro}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <GlossaryContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function GlossaryContent({
  searchParams,
}: {
  searchParams: Props["searchParams"];
}) {
  const params = await searchParams;
  const q = readParam(params.q);
  const craft = parseGlossaryCraft(readParam(params.tecnica));

  const terms = await listGlossaryTerms();
  const filtered = filterGlossaryTerms(terms, { q, craft });
  const sections = groupGlossaryTerms(filtered);

  return (
    <div className="flex flex-col gap-4">
      <GlossaryFilters q={q} craft={craft} />

      {filtered.length > 0 ? (
        <>
          <p
            className="text-muted-foreground text-sm"
            data-testid="glossary-count"
          >
            {glossaryCountLabel(filtered.length)}
          </p>

          <div className="flex flex-col gap-6">
            {sections.map((section) => (
              <section
                key={section.kind}
                className="flex flex-col gap-3"
                data-testid={`glossary-section-${section.kind}`}
              >
                <h2 className="font-heading text-xl font-semibold">
                  {es.glossary.kindLabels[section.kind]}
                </h2>
                <div className="flex flex-col gap-3">
                  {section.terms.map((term) => (
                    <GlossaryTermCard key={term.slug} term={term} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={BookMarked}
          title={es.glossary.emptyTitle}
          body={es.glossary.emptyBody}
          action={
            <Button asChild>
              <Link href="/comunidad">{es.glossary.emptyAction}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
