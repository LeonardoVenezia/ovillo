import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PatternForm } from "@/features/pattern/components/pattern-form";
import { emptyPatternForm } from "@/features/pattern/schemas";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.patterns.proposeTitle,
};

/**
 * Sumar un patrón (spec §5.5): pide sesión (el proxy redirige) y eso alcanza;
 * a diferencia de las lanas, la spec no pide email confirmado. La acción
 * revalida autorización igual en el servidor.
 */
export default function ProposePatternPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.patterns.proposeTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {es.patterns.proposeIntro}
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProposeContent />
      </Suspense>
    </section>
  );
}

async function ProposeContent() {
  await requireUser();

  return (
    <PatternForm
      mode="create"
      initial={emptyPatternForm}
      cancelHref="/explorar/patrones"
    />
  );
}
