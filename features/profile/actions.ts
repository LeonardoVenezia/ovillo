"use server";

import { getDb } from "@/db";
import { profile } from "@/db/profile-schema";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

import {
  buildProfileLinks,
  onboardingSchema,
  profileUpdateSchema,
} from "./schemas";

/**
 * Acciones de servidor del perfil (spec §9: mutaciones con validación Zod y
 * autorización en servidor). Devuelven un resultado simple para que la UI
 * muestre el error sin romperse.
 */

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

/** Guarda el onboarding de bienvenida (spec §5.1, pasos 1 y 2). */
export async function saveOnboarding(
  input: unknown,
): Promise<ProfileActionResult> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.profile.errors.generic };
  }

  const { crafts, skillLevel, country, location } = parsed.data;
  const values = {
    crafts,
    skillLevel,
    country,
    location: location || null,
    updatedAt: new Date(),
  };

  await getDb()
    .insert(profile)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: profile.userId, set: values });

  return { ok: true };
}

/** Guarda la edición del perfil desde Configuración (spec §5.1). */
export async function updateProfile(
  input: unknown,
): Promise<ProfileActionResult> {
  const user = await requireUser();
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: es.profile.errors.generic };
  }

  const { bio, location, country, crafts, skillLevel } = parsed.data;
  const values = {
    bio: bio || null,
    location: location || null,
    country: country || null,
    crafts,
    skillLevel: skillLevel || null,
    links: buildProfileLinks(parsed.data),
    defaultVisibility: parsed.data.visibility,
    updatedAt: new Date(),
  };

  await getDb()
    .insert(profile)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: profile.userId, set: values });

  return { ok: true };
}
