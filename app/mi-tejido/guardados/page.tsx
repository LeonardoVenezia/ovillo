import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SavedView } from "@/features/saved/components/saved-view";
import { listSaved } from "@/features/saved/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.saved.title,
};

/**
 * Guardados y colecciones (spec §5.8, `/mi-tejido/guardados`).
 *
 * Todo es privado y se lee al momento; la sesión y los datos van dentro del
 * límite de `Suspense` para que el encabezado viaje en el caparazón.
 */

export default function SavedPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.saved.title}
        </h1>
        <p className="text-muted-foreground text-sm">{es.saved.intro}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <SavedContent />
      </Suspense>
    </section>
  );
}

async function SavedContent() {
  const user = await requireUser();
  const { items, collections } = await listSaved(user.id);

  return <SavedView items={items} collections={collections} />;
}
