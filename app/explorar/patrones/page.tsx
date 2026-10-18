import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: `${es.explore.patronesTitle} · ${es.explore.title}`,
};

/**
 * Patrones del catálogo (spec §5.5): llegan en el próximo tramo de la Fase 4.
 * La ruta ya existe para que los enlaces no mueran.
 */
export default function PatternsPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {es.explore.patronesTitle}
      </h1>
      <EmptyState
        icon={BookOpen}
        title={es.explore.soon}
        body={es.explore.soonBody}
      />
    </section>
  );
}
