import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { StashView } from "@/features/stash/components/stash-view";
import { listStashItems } from "@/features/stash/queries";
import { listYarnOptions } from "@/features/yarn/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.stash.title,
};

/**
 * Inventario de lana (spec §5.7, `/mi-tejido/lanas`).
 *
 * La sesión y los datos viven dentro del límite de `Suspense`: el encabezado
 * viaja en el caparazón estático. `?nueva=1` (que usa la hoja *Crear*) abre
 * el formulario directamente.
 */

type Props = PageProps<"/mi-tejido/lanas">;

export default function StashPage({ searchParams }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.stash.title}
        </h1>
        <p className="text-muted-foreground text-sm">{es.stash.intro}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <StashContent searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function StashContent({ searchParams }: Pick<Props, "searchParams">) {
  const user = await requireUser();
  const params = await searchParams;
  const [items, yarnOptions] = await Promise.all([
    listStashItems(user.id),
    listYarnOptions(),
  ]);

  const nueva = Array.isArray(params.nueva) ? params.nueva[0] : params.nueva;

  return (
    <StashView
      items={items}
      yarnOptions={yarnOptions}
      initialCreating={nueva === "1"}
    />
  );
}
