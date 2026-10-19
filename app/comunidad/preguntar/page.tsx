import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ThreadForm } from "@/features/community/components/thread-form";
import { listUserGroups } from "@/features/community/queries";
import { getOwnProjectForHelp } from "@/features/community/thread-queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Pedir ayuda (spec §5.9): una pregunta en un grupo propio, con el proyecto
 * adjunto si se llegó desde su ficha (`?proyecto=id`). Ruta privada: el proxy
 * manda a ingresar sin sesión; acá se releen la sesión, el proyecto (tiene
 * que ser propio y estar vivo) y los grupos activos.
 */

type Props = PageProps<"/comunidad/preguntar">;

export const metadata: Metadata = {
  title: es.community.askHelp.title,
};

export const instant = false;

export default async function AskHelpPage({ searchParams }: Props) {
  const { proyecto } = await searchParams;
  const projectId =
    typeof proyecto === "string" && proyecto.length > 0 ? proyecto : undefined;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <AskHelpView projectId={projectId} />
      </Suspense>
    </section>
  );
}

async function AskHelpView({ projectId }: { projectId?: string }) {
  const user = await requireUser();
  const project = projectId
    ? await getOwnProjectForHelp(projectId, user.id)
    : null;
  if (projectId && !project) {
    notFound();
  }

  const myGroups = await listUserGroups(user.id);
  const groups = myGroups
    .filter((item) => item.status === "activo")
    .map((item) => ({
      id: item.group.id,
      slug: item.group.slug,
      name: item.group.name,
    }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.community.askHelp.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {es.community.askHelp.intro}
        </p>
      </div>

      <ThreadForm
        groups={groups}
        allowedTypes={["pregunta"]}
        project={
          project
            ? {
                id: project.id,
                name: project.name,
                cover: project.cover,
                patternName: project.patternName,
              }
            : null
        }
        defaultTitle={
          project
            ? es.community.askHelp.titlePrefill.replace("{name}", project.name)
            : ""
        }
        cancelHref={project ? "/mi-tejido/proyectos" : "/comunidad"}
      />
    </div>
  );
}
