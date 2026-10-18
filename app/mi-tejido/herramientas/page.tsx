import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EquivalenceTable } from "@/features/tools/components/equivalence-table";
import { ToolsView } from "@/features/tools/components/tools-view";
import { listTools } from "@/features/tools/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.tools.title,
};

export default function ToolsPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.tools.title}
        </h1>
        <p className="text-muted-foreground text-sm">{es.tools.intro}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ToolsContent />
      </Suspense>

      <EquivalenceTable />
    </section>
  );
}

async function ToolsContent() {
  const user = await requireUser();
  const tools = await listTools(user.id);

  return (
    <ToolsView
      tools={tools.map((tool) => ({
        id: tool.id,
        kind: tool.kind,
        sizeMm: tool.sizeMm,
        material: tool.material,
        lengthCm: tool.lengthCm,
        quantity: tool.quantity,
        notes: tool.notes,
      }))}
    />
  );
}
