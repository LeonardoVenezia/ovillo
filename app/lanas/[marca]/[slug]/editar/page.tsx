import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  YarnForm,
  type YarnFormInitial,
} from "@/features/yarn/components/yarn-form";
import { getYarnByPath, listBrands } from "@/features/yarn/queries";
import { formatMm } from "@/features/tools/sizes";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const instant = false;

export const metadata: Metadata = {
  title: es.yarns.editTitle,
};

type Props = PageProps<"/lanas/[marca]/[slug]/editar">;

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * Editar una lana propia (spec §5.6). El proxy ya pidió sesión; acá se
 * chequea que la lana exista y que sea de quien la propuso.
 */
export default async function EditYarnPage({ params }: Props) {
  const { marca, slug } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditYarnContent
          brandSlug={decodeSegment(marca)}
          yarnSlug={decodeSegment(slug)}
        />
      </Suspense>
    </section>
  );
}

async function EditYarnContent({
  brandSlug,
  yarnSlug,
}: {
  brandSlug: string;
  yarnSlug: string;
}) {
  const user = await requireUser();
  const data = await getYarnByPath(brandSlug, yarnSlug);
  if (!data || data.createdBy !== user.id) {
    notFound();
  }

  const brands = await listBrands();

  const initial: YarnFormInitial = {
    brandChoice: data.brandId,
    brandName: "",
    brandCountry: "",
    name: data.name,
    weight: data.weight,
    fibers:
      data.fiber.length > 0
        ? data.fiber.map((part) => ({
            fiber: part.fiber,
            percentText: String(part.percent),
          }))
        : [{ fiber: "", percentText: "" }],
    gramsText: data.grams === null ? "" : String(data.grams),
    metersText: data.meters === null ? "" : String(data.meters),
    needleMinText: data.needleMmMin === null ? "" : formatMm(data.needleMmMin),
    needleMaxText: data.needleMmMax === null ? "" : formatMm(data.needleMmMax),
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.yarns.editTitle}
        </h1>
        <p className="text-muted-foreground text-sm">{es.yarns.editIntro}</p>
        <p className="text-muted-foreground text-sm">
          {data.brandName} · {data.name}
        </p>
      </div>

      <YarnForm
        mode="edit"
        yarnId={data.id}
        brands={brands}
        initial={initial}
        cancelHref={`/lanas/${brandSlug}/${yarnSlug}`}
      />
    </>
  );
}
