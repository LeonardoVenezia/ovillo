import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalCard } from "@/features/goal/components/goal-card";
import { YearSummaryRows } from "@/features/goal/components/year-summary";
import { getYearOverview } from "@/features/goal/queries";
import { getCurrentYear } from "@/lib/current-year";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.goal.title,
};

/**
 * "Mi año tejiendo" (spec §5.14, `/mi-tejido/meta`).
 *
 * La meta del año actual y el resumen se leen al momento; la sesión y los
 * datos van dentro del límite de `Suspense` para que el encabezado viaje en
 * el caparazón.
 */

export default function GoalPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.goal.title}
        </h1>
        <p className="text-muted-foreground text-sm">{es.goal.intro}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <GoalContent />
      </Suspense>
    </section>
  );
}

async function GoalContent() {
  const user = await requireUser();
  const year = await getCurrentYear();
  const { goal, summary } = await getYearOverview(user.id, year);

  return (
    <div className="flex flex-col gap-4">
      <GoalCard year={year} initialGoal={goal} done={summary.finishedCount} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {es.goal.summaryTitle.replace("{year}", String(year))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <YearSummaryRows summary={summary} />
        </CardContent>
      </Card>
    </div>
  );
}
