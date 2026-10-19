import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { countryName } from "@/features/profile/countries";
import { YarnCommunityProjects } from "@/features/projects/components/yarn-community";
import {
  formatComposition,
  formatNeedles,
  formatSkein,
  weightLabel,
} from "@/features/yarn/format";
import { getYarnByPath } from "@/features/yarn/queries";
import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Ficha pública de una lana (spec §5.6, `/lanas/marca/slug`).
 *
 * El proxy ya chequeó que exista (para poder responder 404 de verdad, D-023).
 * Los datos salen del caché compartido del catálogo. La galería "hechos por
 * la comunidad" va aparte, bajo `<Suspense>`: usa la sesión y datos que
 * cambian seguido, así que no se cachea.
 */

export const instant = false;

type Props = PageProps<"/lanas/[marca]/[slug]">;

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marca, slug } = await params;
  const data = await getYarnByPath(decodeSegment(marca), decodeSegment(slug));
  if (!data) {
    return {};
  }

  const description = [
    formatComposition(data.fiber),
    formatSkein(data.grams, data.meters),
    formatNeedles(data.needleMmMin, data.needleMmMax),
  ]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(" · ");

  return {
    title: `${data.name} · ${data.brandName}`,
    description: description.length > 0 ? description : undefined,
  };
}

export default async function YarnPage({ params }: Props) {
  const { marca, slug } = await params;
  const brandSlug = decodeSegment(marca);
  const yarnSlug = decodeSegment(slug);

  const data = await getYarnByPath(brandSlug, yarnSlug);
  if (!data) {
    notFound();
  }

  const country = data.brandCountry ? countryName(data.brandCountry) : null;
  const composition = formatComposition(data.fiber);
  const proposer =
    data.creatorName ??
    (data.creatorUsername ? `@${data.creatorUsername}` : null);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Link
        href="/explorar/lanas"
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        ← {es.yarns.backToList}
      </Link>

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {data.brandName}
          {country ? ` · ${country}` : ""}
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {data.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{weightLabel(data.weight)}</Badge>
          {data.status === "sin-revisar" ? (
            <Badge variant="outline">{es.yarns.statusUnreviewed}</Badge>
          ) : null}
        </div>
      </div>

      {data.status === "sin-revisar" ? (
        <Alert data-testid="yarn-unreviewed-notice">
          <AlertTitle>{es.yarns.statusUnreviewed}</AlertTitle>
          <AlertDescription>{es.yarns.statusUnreviewedBody}</AlertDescription>
        </Alert>
      ) : null}

      <dl
        className="border-border divide-border flex flex-col divide-y rounded-2xl border"
        data-testid="yarn-detail"
      >
        <DetailRow
          label={es.yarns.detail.composition}
          value={composition.length > 0 ? composition : null}
        />
        <DetailRow
          label={es.yarns.detail.skein}
          value={formatSkein(data.grams, data.meters)}
        />
        <DetailRow
          label={es.yarns.detail.needles}
          value={formatNeedles(data.needleMmMin, data.needleMmMax)}
        />
        <DetailRow label={es.yarns.detail.country} value={country} />
        {proposer ? (
          <div className="flex items-start justify-between gap-4 p-4">
            <dt className="text-muted-foreground text-sm">
              {es.yarns.proposedBy}
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
        <YarnCommunityProjects yarnId={data.id} />
      </Suspense>

      <Suspense fallback={null}>
        <OwnerEditLink
          createdBy={data.createdBy}
          brandSlug={brandSlug}
          yarnSlug={yarnSlug}
        />
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
 * "Editar lana" solo para quien la propuso. Como la ficha sale del caché
 * compartido, la sesión se lee acá aparte (igual que en el perfil público).
 */
async function OwnerEditLink({
  createdBy,
  brandSlug,
  yarnSlug,
}: {
  createdBy: string | null;
  brandSlug: string;
  yarnSlug: string;
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
        <Link
          href={`/lanas/${brandSlug}/${yarnSlug}/editar`}
          data-testid="yarn-edit-link"
        >
          {es.yarns.detail.editCta}
        </Link>
      </Button>
    </div>
  );
}
