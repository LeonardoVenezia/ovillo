import type { Metadata } from "next";
import { Compass } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.explore.title,
};

export default function ExplorePage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {es.explore.title}
      </h1>
      <EmptyState
        icon={Compass}
        title={es.explore.emptyTitle}
        body={es.explore.emptyBody}
      />
    </section>
  );
}
