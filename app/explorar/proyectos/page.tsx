import type { Metadata } from "next";
import { Shirt } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: `${es.explore.proyectosTitle} · ${es.explore.title}`,
};

/**
 * Proyectos públicos de la comunidad (spec §9): llegan con la galería de la
 * Fase 4. La ruta ya existe para que los enlaces no mueran.
 */
export default function ExploreProjectsPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {es.explore.proyectosTitle}
      </h1>
      <EmptyState
        icon={Shirt}
        title={es.explore.soon}
        body={es.explore.soonBody}
      />
    </section>
  );
}
