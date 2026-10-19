import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { QueueView } from "@/features/queue/components/queue-view";
import { listQueue } from "@/features/queue/queries";
import { listStashItems } from "@/features/stash/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.queue.title,
};

/**
 * "Quiero tejer" (spec §5.8, `/mi-tejido/quiero-tejer`).
 *
 * La cola es privada y se lee al momento; la sesión y los datos van dentro
 * del límite de `Suspense` para que el encabezado viaje en el caparazón.
 * El inventario alimenta el selector de lana planeada.
 */

export default function QueuePage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.queue.title}
        </h1>
        <p className="text-muted-foreground text-sm">{es.queue.intro}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <QueueContent />
      </Suspense>
    </section>
  );
}

async function QueueContent() {
  const user = await requireUser();
  const [entries, stashItems] = await Promise.all([
    listQueue(user.id),
    listStashItems(user.id),
  ]);

  return <QueueView entries={entries} stashItems={stashItems} />;
}
