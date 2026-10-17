import Link from "next/link";

import { isCraft } from "@/features/profile/constants";
import { es } from "@/messages/es";

import { formatProjectShortDate } from "../format";
import type { Project } from "../queries";
import { ProgressBar } from "./progress-bar";
import { ProjectStatusBadge } from "./project-status-badge";

/** Tarjeta de proyecto para listados (Mi tejido y perfil público). */
export function ProjectCard({
  project,
  href,
}: {
  project: Project;
  href: string;
}) {
  const craftLabel =
    project.craft && isCraft(project.craft)
      ? es.profile.craftLabels[project.craft]
      : null;

  return (
    <Link
      href={href}
      className="border-border bg-card hover:bg-muted/40 focus-visible:outline-ring flex flex-col gap-2.5 rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="leading-snug font-medium">{project.name}</span>
        <ProjectStatusBadge status={project.status} />
      </span>
      <span className="text-muted-foreground text-sm">
        {craftLabel ? `${craftLabel} · ` : ""}
        {es.projects.updatedOn} {formatProjectShortDate(project.updatedAt)}
      </span>
      {project.progress !== null ? (
        <ProgressBar value={project.progress} />
      ) : null}
    </Link>
  );
}
