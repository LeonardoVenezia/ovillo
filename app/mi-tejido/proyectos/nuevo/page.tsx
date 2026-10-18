import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { listPatternOptions } from "@/features/pattern/queries";
import { ProjectForm } from "@/features/projects/components/project-form";
import { emptyProjectValues } from "@/features/projects/schemas";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.projects.createTitle,
};

type Props = PageProps<"/mi-tejido/proyectos/nuevo">;

/**
 * Crear proyecto (spec §5.3). "Empezar proyecto" desde una ficha de patrón
 * (spec §5.5) llega con `?patron=slug`: el selector viene elegido y el
 * proyecto nace vinculado a la biblioteca.
 */
export default function NewProjectPage({ searchParams }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.projects.createTitle}
        </h1>
        <p className="text-muted-foreground">{es.projects.createSubtitle}</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewProjectContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function NewProjectContent({
  searchParams,
}: Pick<Props, "searchParams">) {
  const params = await searchParams;
  const raw = params.patron;
  const patronSlug = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");

  const patternOptions = await listPatternOptions();
  const linked = patternOptions.find((option) => option.slug === patronSlug);
  const initial = linked
    ? { ...emptyProjectValues, patternId: linked.id }
    : emptyProjectValues;

  return (
    <ProjectForm
      mode="create"
      initial={initial}
      patternOptions={patternOptions}
      cancelHref="/mi-tejido/proyectos"
    />
  );
}
