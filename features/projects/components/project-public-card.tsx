import { Lock } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { isCraft } from "@/features/profile/constants";
import { es } from "@/messages/es";

import { formatProjectDate } from "../format";
import type { PublicProjectPage } from "../queries";
import { ProgressBar } from "./progress-bar";
import { ProjectStatusBadge } from "./project-status-badge";

/**
 * Página pública de un proyecto (spec §5.3): lo que se ve sin sesión.
 * Los proyectos privados se muestran solo a su dueña; para el resto, una
 * tarjeta que cuenta que existe pero no es público.
 */
export function ProjectPublicCard({
  data,
  isOwner,
}: {
  data: PublicProjectPage;
  isOwner: boolean;
}) {
  const { project, owner } = data;

  if (project.visibility === "privado" && !isOwner) {
    return (
      <EmptyState
        icon={Lock}
        title={es.projects.privateTitle}
        body={es.projects.privateBody}
      />
    );
  }

  const craftLabel =
    project.craft && isCraft(project.craft)
      ? es.profile.craftLabels[project.craft]
      : null;

  const details = [
    craftLabel ? { label: es.projects.craftLabel, value: craftLabel } : null,
    project.patternText
      ? { label: es.projects.patternLabel, value: project.patternText }
      : null,
    project.size ? { label: es.projects.sizeLabel, value: project.size } : null,
    project.madeFor
      ? { label: es.projects.madeForLabel, value: project.madeFor }
      : null,
    project.startedAt
      ? {
          label: es.projects.startedAtLabel,
          value: formatProjectDate(project.startedAt),
        }
      : null,
    project.finishedAt
      ? {
          label: es.projects.finishedAtLabel,
          value: formatProjectDate(project.finishedAt),
        }
      : null,
  ].filter((item) => item !== null);

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={owner.username ? `/@${owner.username}` : "/"}
          className="flex items-center gap-3"
        >
          <UserAvatar
            name={owner.name}
            image={owner.image}
            className="size-10"
          />
          <span className="flex flex-col">
            <span className="text-sm font-medium">{owner.name}</span>
            {owner.username ? (
              <span className="text-muted-foreground text-xs">
                @{owner.username}
              </span>
            ) : null}
          </span>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <ProjectStatusBadge status={project.status} />
        </div>

        {isOwner ? (
          <p className="text-muted-foreground text-sm">
            {project.visibility === "privado"
              ? es.projects.privateOwnHint
              : es.projects.ownHint}
          </p>
        ) : null}
      </div>

      {project.progress !== null ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">
              {es.projects.progressTitle}
            </span>
            <span className="text-muted-foreground text-sm">
              {project.progress}%
            </span>
          </div>
          <ProgressBar value={project.progress} />
        </div>
      ) : null}

      {project.notes ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold">
            {es.projects.notesTitle}
          </h2>
          <p className="text-sm break-words whitespace-pre-wrap">
            {project.notes}
          </p>
        </div>
      ) : null}

      {details.length > 0 ? (
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {details.map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">{item.label}</dt>
              <dd className="break-words">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {project.tags.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold">
            {es.projects.tagsTitle}
          </h2>
          <p className="text-muted-foreground text-sm">
            {project.tags.map((tag) => `#${tag}`).join("  ")}
          </p>
        </div>
      ) : null}

      {isOwner ? (
        <div>
          <Button variant="outline" size="lg" asChild>
            <Link href={`/mi-tejido/proyectos/${project.slug}`}>
              {es.projects.editCta}
            </Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}
