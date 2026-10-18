import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Shirt } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResendVerificationButton } from "@/features/auth/components/resend-verification-button";
import { VerificationNotice } from "@/features/auth/components/verification-notice";
import { getProfileByUserId } from "@/features/profile/queries";
import { ProjectCard } from "@/features/projects/components/project-card";
import { listProjects, type Project } from "@/features/projects/queries";
import { countStash } from "@/features/stash/queries";
import { countTools } from "@/features/tools/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.myWork.title,
};

export default function MyWorkPage() {
  return (
    <section className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {es.myWork.title}
      </h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <MyWorkContent />
      </Suspense>
    </section>
  );
}

async function MyWorkContent() {
  const user = await requireUser();
  const [profile, projects, toolsCount, stash] = await Promise.all([
    getProfileByUserId(user.id),
    listProjects(user.id),
    countTools(user.id),
    countStash(user.id),
  ]);
  const profileStarted = (profile?.crafts.length ?? 0) > 0;

  return (
    <>
      <Suspense fallback={null}>
        <VerificationNotice />
      </Suspense>

      <div className="flex flex-col gap-0.5">
        <p className="font-heading text-xl font-semibold">
          {es.myWork.greeting} {user.name}
        </p>
        {user.username ? (
          <p className="text-muted-foreground text-sm">@{user.username}</p>
        ) : null}
      </div>

      {!user.emailVerified ? (
        <Alert>
          <AlertTitle>{es.auth.verify.pendingTitle}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{es.auth.verify.pendingBody}</span>
            <ResendVerificationButton email={user.email} />
          </AlertDescription>
        </Alert>
      ) : null}

      {!profileStarted ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {es.myWork.profileHintTitle}
            </CardTitle>
            <CardDescription>{es.myWork.profileHintBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" asChild>
              <Link href="/bienvenida">{es.myWork.profileHintCta}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">
            {es.projects.hubTitle}
          </h2>
          {projects.length > 0 ? (
            <Button size="sm" asChild>
              <Link href="/mi-tejido/proyectos/nuevo">
                {es.projects.newCta}
              </Link>
            </Button>
          ) : null}
        </div>

        {projects.length === 0 ? (
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
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              {statusSummary(projects)}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.slice(0, 3).map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  href={`/mi-tejido/proyectos/${project.slug}`}
                />
              ))}
            </div>
            {projects.length > 3 ? (
              <Link
                href="/mi-tejido/proyectos"
                className="text-sm underline underline-offset-4"
              >
                {es.projects.viewAll} ({projects.length})
              </Link>
            ) : null}
          </>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{es.stash.hubTitle}</CardTitle>
          <CardDescription>{stashSummary(stash)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/mi-tejido/lanas">{es.stash.hubCta}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{es.tools.hubTitle}</CardTitle>
          <CardDescription>{toolsSummary(toolsCount)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/mi-tejido/herramientas">{es.tools.hubCta}</Link>
          </Button>
        </CardContent>
      </Card>

      <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/configuracion" className="underline underline-offset-4">
          {es.myWork.settingsLink}
        </Link>
        {user.username ? (
          <Link
            href={`/@${user.username}`}
            className="underline underline-offset-4"
          >
            {es.myWork.publicProfileLink}
          </Link>
        ) : null}
      </p>
    </>
  );
}

/** "2 tejiendo · 1 terminado": resumen cortito para el hub. */
function statusSummary(projects: Project[]): string {
  const order = ["tejiendo", "en-pausa", "terminado", "frogueado"] as const;
  return order
    .map((status) => {
      const count = projects.filter(
        (project) => project.status === status,
      ).length;
      if (count === 0) {
        return null;
      }
      const label = es.projects.statusLabels[status].toLowerCase();
      return `${count} ${label}`;
    })
    .filter((part): part is string => part !== null)
    .join(" · ");
}

/** "Tenés 12 herramientas guardadas": resumen del inventario para el hub. */
function toolsSummary(count: number): string {
  if (count === 0) {
    return es.tools.hubEmpty;
  }
  if (count === 1) {
    return es.tools.hubCountOne;
  }
  return es.tools.hubCount.replace("{count}", String(count));
}

/** "Tenés 8 lanas guardadas, 23 ovillos en total": resumen para el hub. */
function stashSummary(stash: { items: number; skeins: number }): string {
  if (stash.items === 0) {
    return es.stash.hubEmpty;
  }
  if (stash.items === 1) {
    return es.stash.hubCountOne;
  }
  if (stash.skeins > 0) {
    return es.stash.hubCountSkeins
      .replace("{count}", String(stash.items))
      .replace("{skeins}", String(stash.skeins));
  }
  return es.stash.hubCount.replace("{count}", String(stash.items));
}
