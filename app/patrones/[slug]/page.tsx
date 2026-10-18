import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { weightLabel } from "@/features/yarn/format";
import {
  categoryLabel,
  craftLabel,
  formatDifficulty,
  formatYardage,
  languageLabel,
} from "@/features/pattern/format";
import { PatternCommunityProjects } from "@/features/projects/components/pattern-community";
import { getPatternBySlug } from "@/features/pattern/queries";
import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Ficha pública de un patrón (spec §5.5, `/patrones/slug`).
 *
 * El proxy ya chequeó que exista (para poder responder 404 de verdad, D-023).
 * Los datos salen del caché compartido de la biblioteca; la galería "Hechos
 * por la comunidad" va aparte, en `Suspense`, porque mira la sesión y los
 * proyectos del momento. Las valoraciones de la comunidad llegan más
 * adelante; el botón principal lleva a donde el patrón está publicado.
 */

export const instant = false;

type Props = PageProps<"/patrones/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPatternBySlug(slug);
  if (!data) {
    return {};
  }

  const description = [
    data.designerName,
    data.craft ? craftLabel(data.craft) : null,
    categoryLabel(data.category),
  ]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(" · ");

  return {
    title: `${data.name}${data.designerName ? ` · ${data.designerName}` : ""}`,
    description: description.length > 0 ? description : undefined,
  };
}

export default async function PatternPage({ params }: Props) {
  const { slug } = await params;

  const data = await getPatternBySlug(slug);
  if (!data) {
    notFound();
  }

  const proposer =
    data.creatorName ??
    (data.creatorUsername ? `@${data.creatorUsername}` : null);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Link
        href="/explorar/patrones"
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        ← {es.patterns.backToList}
      </Link>

      <div className="flex flex-col gap-2">
        {data.designerName ? (
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {data.designerName}
          </p>
        ) : null}
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {data.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {data.craft ? (
            <Badge variant="secondary">{craftLabel(data.craft)}</Badge>
          ) : null}
          <Badge variant="secondary">{categoryLabel(data.category)}</Badge>
          <Badge variant="secondary">{es.patterns.freeBadge}</Badge>
          {data.status === "sin-revisar" ? (
            <Badge variant="outline">{es.patterns.statusUnreviewed}</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            data-testid="pattern-source-link"
          >
            {es.patterns.sourceCta}
            <ExternalLink aria-hidden="true" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <Link
            href={`/mi-tejido/proyectos/nuevo?patron=${data.slug}`}
            data-testid="pattern-start-project"
          >
            {es.patterns.startCta}
          </Link>
        </Button>
      </div>

      {data.status === "sin-revisar" ? (
        <Alert data-testid="pattern-unreviewed-notice">
          <AlertTitle>{es.patterns.statusUnreviewed}</AlertTitle>
          <AlertDescription>
            {es.patterns.statusUnreviewedBody}
          </AlertDescription>
        </Alert>
      ) : null}

      <dl
        className="border-border divide-border flex flex-col divide-y rounded-2xl border"
        data-testid="pattern-detail"
      >
        <DetailRow
          label={es.patterns.detail.designer}
          value={data.designerName}
        />
        <DetailRow
          label={es.patterns.detail.craft}
          value={data.craft ? craftLabel(data.craft) : null}
        />
        <DetailRow
          label={es.patterns.detail.category}
          value={categoryLabel(data.category)}
        />
        <DetailRow
          label={es.patterns.detail.difficulty}
          value={
            data.difficulty !== null ? formatDifficulty(data.difficulty) : null
          }
        />
        <DetailRow
          label={es.patterns.detail.weight}
          value={data.yarnWeight ? weightLabel(data.yarnWeight) : null}
        />
        <DetailRow
          label={es.patterns.detail.yardage}
          value={formatYardage(data.yardageMin, data.yardageMax)}
        />
        <DetailRow
          label={es.patterns.detail.needles}
          value={data.needleSizes}
        />
        <DetailRow label={es.patterns.detail.gauge} value={data.gauge} />
        <DetailRow label={es.patterns.detail.sizes} value={data.sizes} />
        <DetailRow
          label={es.patterns.detail.language}
          value={languageLabel(data.language)}
        />
        {proposer ? (
          <div className="flex items-start justify-between gap-4 p-4">
            <dt className="text-muted-foreground text-sm">
              {es.patterns.proposedBy}
            </dt>
            <dd className="text-right text-sm font-medium">
              {data.creatorUsername ? (
                <Link
                  href={`/@${data.creatorUsername}`}
                  className="underline underline-offset-4"
                >
                  {proposer}
                </Link>
              ) : (
                proposer
              )}
            </dd>
          </div>
        ) : null}
      </dl>

      <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
        <PatternCommunityProjects patternId={data.id} />
      </Suspense>

      <Suspense fallback={null}>
        <OwnerEditLink createdBy={data.createdBy} slug={slug} />
      </Suspense>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (value === null || value.length === 0) {
    return null;
  }
  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/**
 * "Editar patrón" solo para quien lo sumó. Como la ficha sale del caché
 * compartido, la sesión se lee acá aparte (igual que en la ficha de lana).
 */
async function OwnerEditLink({
  createdBy,
  slug,
}: {
  createdBy: string | null;
  slug: string;
}) {
  if (!createdBy) {
    return null;
  }
  const viewer = await getOptionalUser();
  if (viewer?.id !== createdBy) {
    return null;
  }
  return (
    <div>
      <Button variant="outline" asChild>
        <Link href={`/patrones/${slug}/editar`} data-testid="pattern-edit-link">
          {es.patterns.detail.editCta}
        </Link>
      </Button>
    </div>
  );
}
