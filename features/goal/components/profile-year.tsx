import { ProgressBar } from "@/features/projects/components/progress-bar";
import { getCurrentYear } from "@/lib/current-year";
import { es } from "@/messages/es";

import { getYearOverview } from "../queries";
import { YearSummaryRows } from "./year-summary";

/**
 * "Mi año tejiendo" en el perfil público (spec §5.14): el progreso de la
 * meta y el resumen del año. Solo ocupa lugar si hay meta o proyectos
 * terminados este año; si los detalles del perfil son privados, la página no
 * lo renderiza (misma regla que proyectos y guardados).
 */
export async function ProfileYear({ userId }: { userId: string }) {
  const year = await getCurrentYear();
  const { goal, summary } = await getYearOverview(userId, year);
  if (goal === null && summary.finishedCount === 0) {
    return null;
  }

  const done = summary.finishedCount;
  const percent =
    goal !== null && goal > 0
      ? Math.min(100, Math.round((done / goal) * 100))
      : 0;
  const progressText =
    goal === null
      ? null
      : (done >= goal ? es.goal.goalReached : es.goal.goalProgress)
          .replace("{done}", String(done))
          .replace("{target}", String(goal))
          .replace("{year}", String(year));

  return (
    <section className="flex flex-col gap-3" data-testid="profile-year">
      <h2 className="font-heading text-lg font-semibold">
        {es.goal.profileTitle}
      </h2>
      {progressText !== null ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">{progressText}</p>
          <ProgressBar value={percent} />
        </div>
      ) : null}
      <YearSummaryRows summary={summary} />
    </section>
  );
}
