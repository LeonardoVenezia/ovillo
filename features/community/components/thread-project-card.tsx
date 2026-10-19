import Link from "next/link";

import { es } from "@/messages/es";

import type { ThreadProjectCard as ProjectCardData } from "../thread-queries";

/**
 * Tarjeta del proyecto que acompaña a un hilo (el "Pedir ayuda" de spec
 * §5.9): portada, nombre con enlace al proyecto y su patrón, si tiene.
 */
export function ThreadProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <div
      className="border-border bg-muted/30 flex items-center gap-3 rounded-2xl border p-3"
      data-testid="thread-project-card"
    >
      {project.cover?.thumbUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura pública de R2
        <img
          src={project.cover.thumbUrl}
          alt=""
          className="border-border size-16 shrink-0 rounded-xl border object-cover"
        />
      ) : null}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-muted-foreground text-xs tracking-wide uppercase">
          {es.community.askHelp.projectLabel}
        </span>
        {project.username ? (
          <Link
            href={`/@${project.username}/proyectos/${project.slug}`}
            className="truncate font-medium hover:underline"
          >
            {project.name}
          </Link>
        ) : (
          <span className="truncate font-medium">{project.name}</span>
        )}
        {project.patternName && project.patternSlug ? (
          <Link
            href={`/patrones/${project.patternSlug}`}
            className="text-muted-foreground truncate text-sm hover:underline"
          >
            {es.community.askHelp.patternPrefix.replace(
              "{name}",
              project.patternName,
            )}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
