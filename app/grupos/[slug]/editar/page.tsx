import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { GroupForm } from "@/features/community/components/group-form";
import { getGroupBySlug } from "@/features/community/queries";
import {
  canModerate,
  type GroupFormValues,
} from "@/features/community/schemas";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const instant = false;

export const metadata: Metadata = {
  title: es.community.form.editTitle,
};

type Props = PageProps<"/grupos/[slug]/editar">;

/**
 * Editar grupo (spec §5.9, `/grupos/slug/editar`). Ruta privada: solo quien
 * creó el grupo o sus moderadores; la acción revalida el permiso igual.
 */
export default async function EditGroupPage({ params }: Props) {
  const { slug } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditGroupContent slug={slug} />
      </Suspense>
    </section>
  );
}

async function EditGroupContent({ slug }: { slug: string }) {
  const user = await requireUser();
  const group = await getGroupBySlug(slug, user.id);
  if (!group || !canModerate(group.viewerRole)) {
    notFound();
  }

  const initial: GroupFormValues = {
    name: group.name,
    description: group.description,
    rules: group.rules,
    category: group.category,
    joinPolicy: group.joinPolicy,
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.community.form.editTitle}
        </h1>
        <p className="text-muted-foreground">{group.name}</p>
      </div>

      <GroupForm
        mode="edit"
        groupId={group.id}
        slug={group.slug}
        initial={initial}
        cancelHref={`/grupos/${group.slug}`}
      />
    </>
  );
}
