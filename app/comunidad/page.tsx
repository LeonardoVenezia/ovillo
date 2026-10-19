import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupCard } from "@/features/community/components/group-card";
import { listGroups, listUserGroups } from "@/features/community/queries";
import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.community.title,
};

/**
 * Comunidad (spec §5.9, `/comunidad`): los grupos propios (o la invitación a
 * sumarse) y una muestra de los grupos con más gente, con la puerta al
 * directorio completo. La sesión y los grupos se leen al momento dentro del
 * límite de `Suspense` (D-054).
 */
export default function CommunityPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {es.community.title}
          </h1>
          <p className="text-muted-foreground text-sm">{es.community.intro}</p>
        </div>
        <Button asChild>
          <Link href="/grupos/nuevo" data-testid="community-create">
            {es.community.createCta}
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <CommunityContent />
      </Suspense>
    </section>
  );
}

async function CommunityContent() {
  const user = await getOptionalUser();
  const [myGroups, explore] = await Promise.all([
    user ? listUserGroups(user.id) : Promise.resolve([]),
    listGroups({ viewerId: user?.id, limit: 6 }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {user ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold">
            {es.community.myGroupsTitle}
          </h2>
          {myGroups.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myGroups.map(({ group }) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {es.community.myGroupsEmpty}
            </p>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-semibold">
            {es.community.exploreTitle}
          </h2>
          {explore.length > 0 ? (
            <Link
              href="/grupos"
              className="text-sm underline-offset-4 hover:underline"
            >
              {es.community.viewAll}
            </Link>
          ) : null}
        </div>

        {explore.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {explore.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={es.community.emptyTitle}
            body={es.community.emptyBody}
            action={
              <Button asChild>
                <Link href="/grupos/nuevo">{es.community.createCta}</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}
