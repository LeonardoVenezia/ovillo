import type { Metadata } from "next";
import { BookOpen, Package, Shirt } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.explore.title,
};

/**
 * Explorar (spec §9): la puerta a patrones, proyectos y lanas. Las lanas ya
 * están abiertas; patrones y proyectos llegan en los próximos tramos de la
 * Fase 4, así que sus tarjetas avisan "próximamente" en vez de llevar a una
 * página vacía.
 */
export default function ExplorePage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.explore.title}
        </h1>
        <p className="text-muted-foreground text-sm">{es.explore.intro}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ExploreCard
          href="/explorar/lanas"
          icon={Package}
          title={es.explore.lanasTitle}
          body={es.explore.lanasBody}
        />
        <ExploreCard
          icon={BookOpen}
          title={es.explore.patronesTitle}
          body={es.explore.patronesBody}
        />
        <ExploreCard
          icon={Shirt}
          title={es.explore.proyectosTitle}
          body={es.explore.proyectosBody}
        />
      </div>
    </section>
  );
}

function ExploreCard({
  href,
  icon: Icon,
  title,
  body,
}: {
  href?: string;
  icon: typeof Package;
  title: string;
  body: string;
}) {
  const content = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
          <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
        </span>
        {href ? null : <Badge variant="outline">{es.explore.soon}</Badge>}
      </span>
      <span className="font-heading text-lg font-semibold">{title}</span>
      <span className="text-muted-foreground text-sm">{body}</span>
    </>
  );

  if (!href) {
    return (
      <div className="border-border bg-card/60 flex flex-col gap-2 rounded-2xl border border-dashed p-4">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      data-testid="explore-lanas-card"
      className="border-border bg-card hover:bg-muted/40 focus-visible:outline-ring flex flex-col gap-2 rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {content}
    </Link>
  );
}
