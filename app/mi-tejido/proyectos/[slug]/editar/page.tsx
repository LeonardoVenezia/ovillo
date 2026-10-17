import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ProjectForm } from "@/features/projects/components/project-form";
import { getProjectBySlug } from "@/features/projects/queries";
import { type ProjectFormValues } from "@/features/projects/schemas";
import { isCraft } from "@/features/profile/constants";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const instant = false;

export const metadata: Metadata = {
  title: es.projects.editTitle,
};

type Props = PageProps<"/mi-tejido/proyectos/[slug]/editar">;

export default async function EditProjectPage({ params }: Props) {
  const { slug } = await params;

  return (
    <section className="flex flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditProjectContent slug={slug} />
      </Suspense>
    </section>
  );
}

async function EditProjectContent({ slug }: { slug: string }) {
  const user = await requireUser();
  const project = await getProjectBySlug(user.id, slug);
  if (!project) {
    notFound();
  }

  const initial: ProjectFormValues = {
    name: project.name,
    craft: project.craft && isCraft(project.craft) ? project.craft : "",
    status: project.status,
    progress: project.progress === null ? "" : String(project.progress),
    patternText: project.patternText ?? "",
    size: project.size ?? "",
    madeFor: project.madeFor ?? "",
    startedAt: project.startedAt ?? "",
    tagsText: project.tags.join(", "),
    notes: project.notes ?? "",
    visibility: project.visibility,
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.projects.editTitle}
        </h1>
        <p className="text-muted-foreground">{project.name}</p>
      </div>
      <ProjectForm
        mode="edit"
        projectId={project.id}
        initial={initial}
        cancelHref={`/mi-tejido/proyectos/${project.slug}`}
      />
    </>
  );
}
