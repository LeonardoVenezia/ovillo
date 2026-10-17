import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { user } from "@/db/auth-schema";
import {
  profile,
  type ProfileLink,
  type ProfileVisibility,
} from "@/db/profile-schema";

/**
 * Consultas del perfil (spec §5.2).
 *
 * El perfil propio se lee por `user_id`; el público, por `@usuario`, con
 * `leftJoin` para que las cuentas que todavía no completaron nada también
 * tengan su página.
 */

export type OwnProfile = typeof profile.$inferSelect;

export async function getProfileByUserId(
  userId: string,
): Promise<OwnProfile | null> {
  const rows = await getDb()
    .select()
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export type PublicProfile = {
  user: {
    id: string;
    name: string;
    username: string | null;
    image: string | null;
    createdAt: Date;
  };
  profile: {
    bio: string | null;
    location: string | null;
    country: string | null;
    crafts: string[];
    skillLevel: string | null;
    links: ProfileLink[];
    defaultVisibility: ProfileVisibility;
  } | null;
};

export async function getPublicProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const rows = await getDb()
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      createdAt: user.createdAt,
      profileUserId: profile.userId,
      bio: profile.bio,
      location: profile.location,
      country: profile.country,
      crafts: profile.crafts,
      skillLevel: profile.skillLevel,
      links: profile.links,
      defaultVisibility: profile.defaultVisibility,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(user.username, username))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    user: {
      id: row.id,
      name: row.name,
      username: row.username,
      image: row.image,
      createdAt: row.createdAt,
    },
    profile:
      row.profileUserId === null
        ? null
        : {
            bio: row.bio,
            location: row.location,
            country: row.country,
            crafts: row.crafts ?? [],
            skillLevel: row.skillLevel,
            links: row.links ?? [],
            defaultVisibility: row.defaultVisibility ?? "publico",
          },
  };
}
