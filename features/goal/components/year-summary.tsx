import { es } from "@/messages/es";

import { formatCount, type YearSummary } from "../summary";

/**
 * Filas del resumen anual (spec §5.14): proyectos terminados, metros tejidos
 * y lana más usada. Las comparten la página de la meta y el perfil público.
 * Los datos que no se pueden derivar no se muestran: nunca se inventan
 * números. Si no hay ningún proyecto terminado, una sola frase lo dice.
 */
export function YearSummaryRows({ summary }: { summary: YearSummary }) {
  if (summary.finishedCount === 0) {
    return (
      <p className="text-muted-foreground text-sm">{es.goal.finishedEmpty}</p>
    );
  }

  const finished =
    summary.finishedCount === 1
      ? es.goal.finishedOne
      : es.goal.finishedCount.replace("{count}", String(summary.finishedCount));

  const meters =
    summary.totalMeters !== null && summary.totalMeters > 0
      ? es.goal.metersValue.replace(
          "{meters}",
          formatCount(summary.totalMeters),
        )
      : null;

  const topYarn = summary.topYarn;

  return (
    <div className="flex flex-col gap-3" data-testid="year-summary">
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{es.goal.finishedLabel}</dt>
          <dd className="font-medium" data-testid="year-summary-finished">
            {finished}
          </dd>
        </div>
        {meters !== null ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{es.goal.metersLabel}</dt>
            <dd className="font-medium" data-testid="year-summary-meters">
              {meters}
            </dd>
          </div>
        ) : null}
        {topYarn ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{es.goal.topYarnLabel}</dt>
            <dd
              className="text-right font-medium"
              data-testid="year-summary-top-yarn"
            >
              {topYarn.label}
              {topYarn.meters !== null
                ? ` · ${formatCount(topYarn.meters)} m`
                : topYarn.grams !== null
                  ? ` · ${formatCount(topYarn.grams)} g`
                  : ""}
            </dd>
          </div>
        ) : null}
      </dl>
      {meters !== null ? (
        <p className="text-muted-foreground text-xs">{es.goal.metersHint}</p>
      ) : null}
    </div>
  );
}
