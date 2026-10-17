import type { Metadata } from "next";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.community.title,
};

export default function CommunityPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {es.community.title}
      </h1>
      <EmptyState
        icon={Users}
        title={es.community.emptyTitle}
        body={es.community.emptyBody}
      />
    </section>
  );
}
