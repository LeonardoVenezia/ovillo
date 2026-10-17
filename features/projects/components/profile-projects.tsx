import { es } from "@/messages/es";

import { listLatestPublicProjects } from "../queries";
import { ProjectCard } from "./project-card";

/**
 * Sección "Proyectos" del perfil público (spec §5.2): los últimos proyectos
 * que la persona compartió. Si no hay ninguno, no ocupa lugar.
 */
export async function ProfileProjects({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const { items, total } = await listLatestPublicProjects(userId);
  if (total === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">
          {es.projects.title}
        </h2>
        <span className="text-muted-foreground text-sm">
          {total} {total === 1 ? es.projects.countOne : es.projects.countMany}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            href={`/@${username}/proyectos/${project.slug}`}
          />
        ))}
      </div>
    </section>
  );
}
