import { z } from "zod";

import { es } from "@/messages/es";

import { CRAFT_SLUGS, SKILL_LEVELS } from "./constants";
import { COUNTRY_CODES } from "./countries";

/**
 * Validación del perfil (spec §5.1), compartida entre cliente y servidor:
 * el navegador da feedback, y la Server Action vuelve a validar.
 */

export const BIO_MAX = 160;
export const LOCATION_MAX = 80;

/** De "@tucuenta", "tucuenta" o una URL de Instagram al usuario pelado. */
export function instagramHandle(input: string): string | null {
  const bare = input
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "");
  return /^[a-zA-Z0-9._]{1,30}$/.test(bare) ? bare : null;
}

/** URL normalizada del perfil de Instagram, o `null` si el texto no sirve. */
export function instagramUrl(input: string): string | null {
  const handle = instagramHandle(input);
  return handle ? `https://instagram.com/${handle}` : null;
}

/** De una URL guardada a "@tucuenta" para mostrar en el formulario. */
export function instagramHandleFromUrl(url: string): string {
  const handle = instagramHandle(url);
  return handle ? `@${handle}` : "";
}

/** URL normalizada (agrega https:// si falta), o `null` si no es válida. */
export function websiteUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) {
    return null;
  }
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname.includes(".") || parsed.hostname.startsWith(".")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

const bio = z.string().trim().max(BIO_MAX, es.profile.errors.bioLong);

const location = z.string().trim().max(LOCATION_MAX, es.profile.errors.locationLong);

const instagram = z
  .string()
  .trim()
  .refine((value) => value === "" || instagramUrl(value) !== null, {
    message: es.profile.errors.instagramInvalid,
  });

const website = z
  .string()
  .trim()
  .refine((value) => value === "" || websiteUrl(value) !== null, {
    message: es.profile.errors.websiteInvalid,
  });

/** Onboarding (spec §5.1): técnicas + nivel, y país/región. */
export const onboardingSchema = z.object({
  crafts: z.array(z.enum(CRAFT_SLUGS)).min(1, es.profile.errors.craftsRequired),
  skillLevel: z.enum(SKILL_LEVELS),
  country: z.enum(COUNTRY_CODES),
  location,
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;

/** Edición del perfil desde Configuración (spec §5.1). */
export const profileUpdateSchema = z.object({
  bio,
  location,
  country: z.enum(COUNTRY_CODES).or(z.literal("")),
  crafts: z.array(z.enum(CRAFT_SLUGS)),
  skillLevel: z.enum(SKILL_LEVELS).or(z.literal("")),
  instagram,
  website,
  visibility: z.enum(["publico", "privado"]),
});

export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;
