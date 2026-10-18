/* eslint-disable @next/next/no-img-element -- las fotos ya llegan comprimidas;
   next/image no aportaría y sumaría cuota. */

import { Lock, Shirt } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { es } from "@/messages/es";

import type { CommunityProjectItem } from "../community-view";
import { ProjectStatusBadge } from "./project-status-badge";

/**
 * Tarjeta de la galería "hechos por la comunidad" (spec §5.5): la portada,
 * el nombre, quién lo tejió y en qué anda. Los proyectos privados que ve su
 * dueña llevan la marca "Solo para mí".
 */
export function CommunityProjectCard({ item }: { item: CommunityProjectItem }) {
  return (
    <Link
      href={`/@${item.ownerUsername}/proyectos/${item.slug}`}
      data-testid="community-project-card"
      className="border-border bg-card hover:bg-muted/40 focus-visible:outline-ring flex flex-col gap-2.5 rounded-2xl border p-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {item.coverUrl ? (
        <img
          src={item.coverUrl}
          alt={item.name}
          loading="lazy"
          className="border-border aspect-[4/3] w-full rounded-xl border object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="bg-muted text-muted-foreground flex aspect-[4/3] w-full items-center justify-center rounded-xl"
        >
          <Shirt className="size-8" strokeWidth={1.5} />
        </span>
      )}

      <span className="flex flex-wrap items-start justify-between gap-2">
        <span className="leading-snug font-medium">{item.name}</span>
        {item.visibility === "privado" ? (
          <Badge
            variant="outline"
            className="gap-1 text-xs"
            data-testid="community-project-private"
          >
            <Lock className="size-3" aria-hidden="true" />
            {es.projects.visibilityPrivate}
          </Badge>
        ) : null}
      </span>

      <span className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <UserAvatar
            name={item.ownerName}
            image={item.ownerImage}
            className="size-5"
          />
          <span className="text-muted-foreground truncate text-xs">
            @{item.ownerUsername}
          </span>
        </span>
        <ProjectStatusBadge status={item.status} />
      </span>
    </Link>
  );
}
