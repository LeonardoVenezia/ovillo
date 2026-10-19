import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";

import { toCommunityProjectItems } from "../community-view";
import { listYarnProjects } from "../queries";
import { CommunityProjectCard } from "./community-project-card";

/**
 * Galería "Hechos por la comunidad" de una ficha de lana (spec §5.6): los
 * proyectos que usan esa lana —asignada del inventario o del catálogo— y, con
 * sesión, los propios (los privados se marcan). Va bajo `<Suspense>` en la
 * ficha: necesita la sesión y datos que cambian seguido, así que no se cachea.
 */
export async function YarnCommunityProjects({ yarnId }: { yarnId: string }) {
  const viewer = await getOptionalUser();
  const rows = await listYarnProjects(yarnId, viewer?.id ?? null);
  const items = toCommunityProjectItems(rows);

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="yarn-community"
      aria-label={es.yarns.communityTitle}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">
          {es.yarns.communityTitle}
        </h2>
        {items.length > 0 ? (
          <span className="text-muted-foreground text-sm">
            {items.length}{" "}
            {items.length === 1 ? es.projects.countOne : es.projects.countMany}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p
          className="border-border text-muted-foreground rounded-2xl border border-dashed p-4 text-sm"
          data-testid="yarn-community-empty"
        >
          {es.yarns.communityEmpty}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <CommunityProjectCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
