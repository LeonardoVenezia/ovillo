import { Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { es } from "@/messages/es";

import { categoryLabel, joinPolicyLabel, membersLabel } from "../format";
import type { CommunityGroup } from "../queries";

/**
 * Tarjeta de grupo (spec §5.9): portada, nombre, categoría, integrantes y el
 * estado de quien mira ("Ya sos parte" o la solicitud enviada). Sin imagen,
 * cae en un fondo con ícono.
 */
export function GroupCard({ group }: { group: CommunityGroup }) {
  return (
    <Link
      href={`/grupos/${group.slug}`}
      data-testid="group-card"
      className="border-border bg-card hover:bg-muted/40 focus-visible:outline-ring flex flex-col overflow-hidden rounded-2xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="bg-muted border-border flex h-28 shrink-0 items-center justify-center overflow-hidden border-b">
        {group.image?.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura pública de R2
          <img
            src={group.image.thumbUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <Users className="text-muted-foreground size-8" aria-hidden />
        )}
      </span>

      <span className="flex flex-col gap-2 p-4">
        <span className="leading-snug font-medium">{group.name}</span>

        {group.description ? (
          <span className="text-muted-foreground line-clamp-2 text-sm">
            {group.description}
          </span>
        ) : null}

        <span className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{categoryLabel(group.category)}</Badge>
          {group.joinPolicy === "aprobacion" ? (
            <Badge variant="outline">{joinPolicyLabel(group.joinPolicy)}</Badge>
          ) : null}
          <span className="text-muted-foreground text-xs">
            {membersLabel(group.members)}
          </span>
        </span>

        {group.viewerRole || group.viewerPending ? (
          <span className="flex flex-wrap items-center gap-2">
            {group.viewerRole ? <Badge>{es.community.joinBadge}</Badge> : null}
            {group.viewerPending ? (
              <Badge variant="outline">{es.community.pendingBadge}</Badge>
            ) : null}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
