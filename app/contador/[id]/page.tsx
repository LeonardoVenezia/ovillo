import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { FullscreenCounter } from "@/features/counters/components/fullscreen-counter";
import { getOwnCounter } from "@/features/counters/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Contador a pantalla completa (spec §9: `/contador/[id]`, privado).
 *
 * Es una pantalla propia que tapa la navegación de la app: se usa de pie, con
 * las manos ocupadas. La sesión se exige acá también (el proxy solo hace la
 * redirección optimista).
 */

export const instant = false;

export const metadata: Metadata = {
  title: es.counters.title,
};

type Props = PageProps<"/contador/[id]">;

export default async function CounterPage({ params }: Props) {
  const { id } = await params;

  return (
    <Suspense
      fallback={<Skeleton className="fixed inset-0 z-50 rounded-none" />}
    >
      <CounterScreen id={id} />
    </Suspense>
  );
}

async function CounterScreen({ id }: { id: string }) {
  const user = await requireUser();
  const own = await getOwnCounter(user.id, id);
  if (!own) {
    notFound();
  }

  return (
    <FullscreenCounter
      counter={{
        id: own.counter.id,
        name: own.counter.name,
        count: own.counter.count,
        version: own.counter.version,
        repeatEvery: own.counter.repeatEvery,
      }}
      project={{ name: own.project.name, slug: own.project.slug }}
    />
  );
}
