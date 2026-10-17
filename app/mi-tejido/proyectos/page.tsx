import { Shirt } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "@/features/projects/components/project-card";
import { listProjects } from "@/features/projects/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.projects.title,
};

export default function ProjectsPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.projects.title}
        </h1>
        <Button asChild>
          <Link href="/mi-tejido/proyectos/nuevo">{es.projects.newCta}</Link>
        </Button>
      </div>
      <Suspense
        fallback={
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        }
      >
        <ProjectsList />
      </Suspense>
    </section>
  );
}

async function ProjectsList() {
  const user = await requireUser();
  const projects = await listProjects(user.id);

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={Shirt}
        title={es.projects.emptyTitle}
        body={es.projects.emptyBody}
        action={
          <Button size="lg" asChild>
            <Link href="/mi-tejido/proyectos/nuevo">
              {es.projects.firstCta}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          href={`/mi-tejido/proyectos/${project.slug}`}
        />
      ))}
    </div>
  );
}
