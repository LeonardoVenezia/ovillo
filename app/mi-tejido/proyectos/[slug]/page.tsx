import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCounters } from "@/features/counters/components/counter-list";
import { listProjectCounters } from "@/features/counters/queries";
import { isCraft } from "@/features/profile/constants";
import { DeleteProjectButton } from "@/features/projects/components/delete-project-button";
import { ProgressBar } from "@/features/projects/components/progress-bar";
import { ProjectDiary } from "@/features/projects/components/project-diary";
import { ProjectGallery } from "@/features/projects/components/project-gallery";
import { ProjectStatusBadge } from "@/features/projects/components/project-status-badge";
import { ProjectStatusPicker } from "@/features/projects/components/project-status-picker";
import { formatProjectDate } from "@/features/projects/format";
import {
  listProjectEntries,
  listProjectPhotos,
} from "@/features/projects/media-queries";
import { toEntryViews, toPhotoViews } from "@/features/projects/media-view";
import { getProjectBySlug } from "@/features/projects/queries";
import { ProjectYarns } from "@/features/stash/components/project-yarns";
import { listProjectYarns, listStashItems } from "@/features/stash/queries";
import { ProjectTools } from "@/features/tools/components/project-tools";
import { listProjectTools, listTools } from "@/features/tools/queries";
import { listYarnOptions } from "@/features/yarn/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const instant = false;

export const metadata: Metadata = {
  title: es.projects.title,
};

type Props = PageProps<"/mi-tejido/proyectos/[slug]">;

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;

  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProjectDetail slug={slug} />
      </Suspense>
    </section>
  );
}

async function ProjectDetail({ slug }: { slug: string }) {
  const user = await requireUser();
  const project = await getProjectBySlug(user.id, slug);
  if (!project) {
    notFound();
  }

  const [
    photos,
    entries,
    counters,
    yarns,
    projectTools,
    stashItems,
    catalogOptions,
    toolOptions,
  ] = await Promise.all([
    listProjectPhotos(project.id),
    listProjectEntries(project.id),
    listProjectCounters(project.id),
    listProjectYarns(project.id),
    listProjectTools(project.id),
    listStashItems(user.id),
    listYarnOptions(),
    listTools(user.id),
  ]);

  const craftLabel =
    project.craft && isCraft(project.craft)
      ? es.profile.craftLabels[project.craft]
      : null;

  const details = [
    craftLabel ? { label: es.projects.craftLabel, value: craftLabel } : null,
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
    <>
      <Link
        href="/mi-tejido/proyectos"
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        {es.projects.back}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <span className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            {project.visibility === "privado" ? (
              <Badge variant="outline">{es.projects.visibilityPrivate}</Badge>
            ) : null}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="lg" asChild>
            <Link href={`/mi-tejido/proyectos/${project.slug}/editar`}>
              {es.projects.editCta}
            </Link>
          </Button>
          {project.visibility === "publico" && user.username ? (
            <Button variant="ghost" size="lg" asChild>
              <Link href={`/@${user.username}/proyectos/${project.slug}`}>
                {es.projects.viewPublic}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{es.projects.statusLabel}</span>
        <ProjectStatusPicker projectId={project.id} status={project.status} />
        <p className="text-muted-foreground text-xs">
          {es.projects.statusHint}
        </p>
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

      {project.linkedPattern || project.patternText ? (
        <div
          className="flex flex-col gap-0.5 text-sm"
          data-testid="project-pattern"
        >
          <span className="text-muted-foreground text-xs">
            {es.projects.patternLabel}
          </span>
          {project.linkedPattern ? (
            <Link
              href={`/patrones/${project.linkedPattern.slug}`}
              className="underline underline-offset-4"
              data-testid="project-pattern-link"
            >
              {project.linkedPattern.name}
            </Link>
          ) : null}
          {project.patternText ? (
            project.linkedPattern ? (
              <span className="text-muted-foreground text-xs break-words">
                {project.patternText}
              </span>
            ) : /^https?:\/\//.test(project.patternText) ? (
              <a
                href={project.patternText}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                {project.patternText}
              </a>
            ) : (
              <span className="break-words">{project.patternText}</span>
            )
          ) : null}
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

      <ProjectYarns
        projectId={project.id}
        yarns={yarns}
        stashItems={stashItems}
        catalogOptions={catalogOptions}
      />

      <ProjectTools
        projectId={project.id}
        tools={projectTools}
        options={toolOptions}
      />

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

      <ProjectGallery
        projectId={project.id}
        photos={toPhotoViews(photos)}
        coverImageId={project.coverImageId}
      />

      <ProjectDiary projectId={project.id} entries={toEntryViews(entries)} />

      <ProjectCounters
        projectId={project.id}
        counters={counters.map((counter) => ({
          id: counter.id,
          name: counter.name,
          count: counter.count,
          version: counter.version,
          repeatEvery: counter.repeatEvery,
        }))}
      />

      <div className="border-border border-t pt-4">
        <DeleteProjectButton projectId={project.id} />
      </div>
    </>
  );
}
