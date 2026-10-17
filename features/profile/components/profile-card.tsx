import { AtSign, CalendarDays, Globe, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { es } from "@/messages/es";

import { isCraft, isSkillLevel } from "../constants";
import { countryName } from "../countries";
import type { PublicProfile } from "../queries";

/**
 * Tarjeta del perfil público (spec §5.2) tal como la ve la comunidad.
 *
 * Las pestañas (Proyectos, Guardados, Grupos, Actividad) y los contadores
 * llegan con sus módulos; mientras tanto, la página cuenta quién es la
 * persona. Un perfil privado muestra solo avatar, nombre y @usuario.
 */

const memberSinceFormat = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
});

export function ProfileCard({
  data,
  isOwner,
}: {
  data: PublicProfile;
  isOwner: boolean;
}) {
  const { user, profile } = data;
  const detailsVisible =
    !profile || profile.defaultVisibility !== "privado" || isOwner;

  const crafts = (profile?.crafts ?? []).filter(isCraft);
  const skill =
    profile?.skillLevel && isSkillLevel(profile.skillLevel)
      ? profile.skillLevel
      : null;
  const country = profile?.country ? countryName(profile.country) : null;
  const place = [profile?.location, country]
    .filter((part): part is string => Boolean(part))
    .join(", ");
  const links = profile?.links ?? [];
  const memberSince = memberSinceFormat.format(user.createdAt);
  const hasDetails =
    Boolean(profile?.bio) ||
    crafts.length > 0 ||
    Boolean(skill) ||
    Boolean(place) ||
    links.length > 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start gap-4">
          <UserAvatar
            name={user.name}
            image={user.image}
            className="size-16 text-lg"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {user.name}
            </h1>
            {user.username ? (
              <p className="text-muted-foreground">@{user.username}</p>
            ) : null}
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
              <CalendarDays className="size-3.5 shrink-0" />
              {es.profile.memberSince} {memberSince}
            </p>
          </div>
          {isOwner ? (
            <div className="flex flex-wrap items-center gap-2">
              {profile?.defaultVisibility === "privado" ? (
                <Badge variant="outline">{es.profile.visibilityPrivate}</Badge>
              ) : null}
              <Button variant="outline" size="sm" asChild>
                <Link href="/configuracion">{es.profile.editCta}</Link>
              </Button>
            </div>
          ) : null}
        </div>

        {!detailsVisible ? (
          <p className="text-muted-foreground text-sm">
            {es.profile.detailsPrivate}
          </p>
        ) : !hasDetails ? (
          <div className="flex flex-col items-start gap-4">
            <div>
              <p className="font-medium">{es.profile.emptyTitle}</p>
              <p className="text-muted-foreground text-sm">
                {isOwner ? es.profile.emptyOwnBody : es.profile.emptyBody}
              </p>
            </div>
            {isOwner ? (
              <Button size="lg" asChild>
                <Link href="/bienvenida">{es.profile.emptyCta}</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {profile?.bio ? <p className="text-pretty">{profile.bio}</p> : null}

            {place ? (
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <MapPin className="size-4 shrink-0" />
                {place}
              </p>
            ) : null}

            {crafts.length > 0 || skill ? (
              <div className="flex flex-wrap gap-2">
                {crafts.map((craft) => (
                  <Badge key={craft} variant="secondary">
                    {es.profile.craftLabels[craft]}
                  </Badge>
                ))}
                {skill ? (
                  <Badge variant="outline">{es.profile.skillLabels[skill]}</Badge>
                ) : null}
              </div>
            ) : null}

            {links.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {links.map((link) => (
                  <Button key={link.url} variant="outline" size="sm" asChild>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.kind === "instagram" ? <AtSign /> : <Globe />}
                      {link.kind === "instagram"
                        ? es.profile.instagramLabel
                        : es.profile.websiteLabel}
                    </a>
                  </Button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
