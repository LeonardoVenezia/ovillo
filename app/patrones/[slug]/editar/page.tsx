import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  PatternForm,
  type PatternFormInitial,
} from "@/features/pattern/components/pattern-form";
import { getPatternBySlug } from "@/features/pattern/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const instant = false;

export const metadata: Metadata = {
  title: es.patterns.editTitle,
};

type Props = PageProps<"/patrones/[slug]/editar">;

/**
 * Editar un patrón propio (spec §5.5). El proxy ya pidió sesión; acá se
 * chequea que el patrón exista y que sea de quien lo sumó.
 */
export default async function EditPatternPage({ params }: Props) {
  const { slug } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditPatternContent slug={slug} />
      </Suspense>
    </section>
  );
}

async function EditPatternContent({ slug }: { slug: string }) {
  const user = await requireUser();
  const data = await getPatternBySlug(slug);
  if (!data || data.createdBy !== user.id) {
    notFound();
  }

  const initial: PatternFormInitial = {
    name: data.name,
    designerName: data.designerName ?? "",
    sourceUrl: data.sourceUrl,
    craft: data.craft ?? "",
    category: data.category,
    difficulty: data.difficulty === null ? "" : String(data.difficulty),
    weight: data.yarnWeight ?? "",
    yardageMinText: data.yardageMin === null ? "" : String(data.yardageMin),
    yardageMaxText: data.yardageMax === null ? "" : String(data.yardageMax),
    needleSizes: data.needleSizes ?? "",
    gauge: data.gauge ?? "",
    sizes: data.sizes ?? "",
    language: data.language,
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.patterns.editTitle}
        </h1>
        <p className="text-muted-foreground text-sm">{es.patterns.editIntro}</p>
        <p className="text-muted-foreground text-sm">{data.name}</p>
      </div>

      <PatternForm
        mode="edit"
        patternId={data.id}
        initial={initial}
        cancelHref={`/patrones/${slug}`}
      />
    </>
  );
}
