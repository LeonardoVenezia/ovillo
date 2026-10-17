import type { Metadata } from "next";

import { ProjectForm } from "@/features/projects/components/project-form";
import { emptyProjectValues } from "@/features/projects/schemas";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.projects.createTitle,
};

export default function NewProjectPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.projects.createTitle}
        </h1>
        <p className="text-muted-foreground">{es.projects.createSubtitle}</p>
      </div>
      <ProjectForm
        mode="create"
        initial={emptyProjectValues}
        cancelHref="/mi-tejido/proyectos"
      />
    </section>
  );
}
