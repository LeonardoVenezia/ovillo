import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupJoinButton } from "@/features/community/components/group-join-button";
import { GroupMembers } from "@/features/community/components/group-members";
import { GroupPending } from "@/features/community/components/group-pending";
import {
  categoryLabel,
  joinPolicyLabel,
  membersLabel,
} from "@/features/community/format";
import {
  getGroupBySlug,
  listGroupMembers,
  listPendingMembers,
} from "@/features/community/queries";
import { canModerate, isGroupOwner } from "@/features/community/schemas";
import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Ficha de un grupo (spec §5.9, `/grupos/slug`).
 *
 * El proxy ya chequeó que exista (para poder responder 404 de verdad, D-023).
 * La ficha se lee al momento porque muestra el estado de quien mira: el botón
 * de unirse, las solicitudes pendientes (solo moderación) y la lista de
 * integrantes. Los hilos y respuestas llegan en el tramo 2 de la fase.
 */

type Props = PageProps<"/grupos/[slug]">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  return group ? { title: group.name } : {};
}

export default async function GroupPage({ params }: Props) {
  const { slug } = await params;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <GroupView slug={slug} />
      </Suspense>
    </section>
  );
}

async function GroupView({ slug }: { slug: string }) {
  const user = await getOptionalUser();
  const group = await getGroupBySlug(slug, user?.id);
  if (!group) {
    notFound();
  }

  const moderates = canModerate(group.viewerRole);
  const [members, pending] = await Promise.all([
    listGroupMembers(group.id),
    moderates ? listPendingMembers(group.id) : Promise.resolve([]),
  ]);

  const joinState = group.viewerRole
    ? "miembro"
    : group.viewerPending
      ? "pendiente"
      : "fuera";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="bg-muted border-border flex h-40 items-center justify-center overflow-hidden rounded-2xl border">
          {group.image?.fullUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto pública de R2
            <img
              src={group.image.fullUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <Users className="text-muted-foreground size-10" aria-hidden />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{categoryLabel(group.category)}</Badge>
            {group.joinPolicy === "aprobacion" ? (
              <Badge variant="outline">
                {joinPolicyLabel(group.joinPolicy)}
              </Badge>
            ) : null}
            {group.viewerRole ? <Badge>{es.community.joinBadge}</Badge> : null}
            {group.viewerPending ? (
              <Badge variant="outline">{es.community.pendingBadge}</Badge>
            ) : null}
          </div>

          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {group.name}
          </h1>

          <p className="text-muted-foreground text-sm" data-testid="group-meta">
            {membersLabel(group.members)} · {es.community.createdBy}{" "}
            {group.creatorUsername ? (
              <Link
                href={`/@${group.creatorUsername}`}
                className="underline underline-offset-4"
              >
                {group.creatorName}
              </Link>
            ) : (
              group.creatorName
            )}
          </p>

          <p className="text-muted-foreground text-sm">
            {es.community.joinPolicyHints[group.joinPolicy]}
          </p>
        </div>

        {group.description ? (
          <p className="whitespace-pre-line">{group.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            isGroupOwner(group.viewerRole) ? (
              <>
                <Button asChild>
                  <Link
                    href={`/grupos/${group.slug}/editar`}
                    data-testid="group-edit"
                  >
                    {es.community.editCta}
                  </Link>
                </Button>
                <span className="text-muted-foreground text-sm">
                  {es.community.ownerNote}
                </span>
              </>
            ) : (
              <>
                <GroupJoinButton
                  groupId={group.id}
                  joinPolicy={group.joinPolicy}
                  initialState={joinState}
                />
                {moderates ? (
                  <Button variant="outline" asChild>
                    <Link
                      href={`/grupos/${group.slug}/editar`}
                      data-testid="group-edit"
                    >
                      {es.community.editCta}
                    </Link>
                  </Button>
                ) : null}
              </>
            )
          ) : (
            <Button asChild>
              <Link
                href={`/ingresar?volver=${encodeURIComponent(`/grupos/${group.slug}`)}`}
                data-testid="group-sign-in"
              >
                {es.community.signInCta}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {group.rules ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-xl font-semibold">
            {es.community.rulesTitle}
          </h2>
          <p className="border-border bg-card rounded-2xl border p-4 text-sm whitespace-pre-line">
            {group.rules}
          </p>
        </section>
      ) : null}

      {moderates && pending.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-xl font-semibold">
            {es.community.pendingTitle}
          </h2>
          <GroupPending groupId={group.id} requests={pending} />
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold">
          {es.community.membersTitle}
        </h2>
        <GroupMembers
          groupId={group.id}
          members={members}
          isOwner={isGroupOwner(group.viewerRole)}
        />
      </section>
    </div>
  );
}
