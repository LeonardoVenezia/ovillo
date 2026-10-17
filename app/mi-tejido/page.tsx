import type { Metadata } from "next";
import { Notebook } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.myWork.title,
};

export default function MyWorkPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {es.myWork.title}
      </h1>
      <EmptyState
        icon={Notebook}
        title={es.myWork.emptyTitle}
        body={es.myWork.emptyBody}
      />
    </section>
  );
}
