import { z } from "zod";

import type { ProfileLink } from "@/db/profile-schema";
import { es } from "@/messages/es";

import { CRAFT_SLUGS, SKILL_LEVELS } from "./constants";
import { COUNTRY_CODES } from "./countries";

/**
 * Validación del perfil (spec §5.1), compartida entre cliente y servidor:
 * el navegador da feedback, y la Server Action vuelve a validar.
 */

export const BIO_MAX = 160;
export const LOCATION_MAX = 80;

/** Redes sociales del perfil, en el orden en que se muestran. */
export const SOCIAL_KINDS = [
  "instagram",
  "tiktok",
  "facebook",
  "pinterest",
] as const;

export type SocialKind = (typeof SOCIAL_KINDS)[number];

type SocialConfig = {
  /** Quita el dominio si el texto pegado es una URL (con o sin protocolo). */
  hostPattern: RegExp;
  /** Formato del usuario pelado de cada red. */
  handlePattern: RegExp;
  /** Cómo se arma la URL normalizada a partir del usuario. */
  build: (handle: string) => string;
  /** Con qué se muestra el usuario en el formulario (@ en Instagram y TikTok). */
  displayPrefix: string;
};

const SOCIAL_CONFIG: Record<SocialKind, SocialConfig> = {
  instagram: {
    hostPattern: /^(?:https?:\/\/)?(?:www\.)?instagram\.com(?:\/|$)/i,
    handlePattern: /^[a-zA-Z0-9._]{1,30}$/,
    build: (handle) => `https://instagram.com/${handle}`,
    displayPrefix: "@",
  },
  tiktok: {
    hostPattern: /^(?:https?:\/\/)?(?:www\.)?tiktok\.com(?:\/|$)/i,
    handlePattern: /^[a-zA-Z0-9._]{2,24}$/,
    build: (handle) => `https://tiktok.com/@${handle}`,
    displayPrefix: "@",
  },
  facebook: {
    hostPattern:
      /^(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.com)(?:\/|$)/i,
    handlePattern: /^[a-zA-Z0-9.]{5,50}$/,
    build: (handle) => `https://facebook.com/${handle}`,
    displayPrefix: "",
  },
  pinterest: {
    hostPattern:
      /^(?:https?:\/\/)?(?:[a-z]{2}\.)?(?:www\.)?pinterest\.[a-z.]+(?:\/|$)/i,
    handlePattern: /^[a-zA-Z0-9_]{3,30}$/,
    build: (handle) => `https://pinterest.com/${handle}`,
    displayPrefix: "",
  },
};

/** De "@tucuenta", "tucuenta" o una URL completa al usuario pelado. */
export function socialHandle(kind: SocialKind, input: string): string | null {
  const config = SOCIAL_CONFIG[kind];
  // Si pegaron una URL, primero el dominio y después query o hash.
  const [path = ""] = input
    .trim()
    .replace(config.hostPattern, "")
    .split(/[?#]/);
  const segment = path.replace(/\/+$/, "");
  // Un perfil vive en un solo segmento (/usuario); el resto es contenido.
  if (segment.includes("/")) {
    return null;
  }
  const bare = segment.replace(/^@/, "");
  // Los perfiles sin usuario propio (profile.php?id=…) no se pueden normalizar.
  if (kind === "facebook" && bare === "profile.php") {
    return null;
  }
  return config.handlePattern.test(bare) ? bare : null;
}

/** URL normalizada del perfil en la red, o `null` si el texto no sirve. */
export function socialUrl(kind: SocialKind, input: string): string | null {
  const handle = socialHandle(kind, input);
  return handle ? SOCIAL_CONFIG[kind].build(handle) : null;
}

/** De una URL guardada al texto que se muestra en el formulario. */
export function socialDisplay(kind: SocialKind, url: string): string {
  const handle = socialHandle(kind, url);
  return handle ? `${SOCIAL_CONFIG[kind].displayPrefix}${handle}` : "";
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

const location = z
  .string()
  .trim()
  .max(LOCATION_MAX, es.profile.errors.locationLong);

/** Campo de una red: vacío, o un usuario o enlace que se puede normalizar. */
function socialField(kind: SocialKind, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || socialUrl(kind, value) !== null, {
      message,
    });
}

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
  instagram: socialField("instagram", es.profile.errors.instagramInvalid),
  tiktok: socialField("tiktok", es.profile.errors.tiktokInvalid),
  facebook: socialField("facebook", es.profile.errors.facebookInvalid),
  pinterest: socialField("pinterest", es.profile.errors.pinterestInvalid),
  website,
  visibility: z.enum(["publico", "privado"]),
});

export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;

/** Los campos de enlace del formulario, tal como se guardan y se leen. */
export type ProfileLinkValues = {
  instagram: string;
  tiktok: string;
  facebook: string;
  pinterest: string;
  website: string;
};

/** Enlaces listos para guardar, en orden fijo de aparición. */
export function buildProfileLinks(values: ProfileLinkValues): ProfileLink[] {
  const links: ProfileLink[] = [];
  for (const kind of SOCIAL_KINDS) {
    const url = socialUrl(kind, values[kind]);
    if (url) {
      links.push({ kind, url });
    }
  }
  const web = websiteUrl(values.website);
  if (web) {
    links.push({ kind: "web", url: web });
  }
  return links;
}

/** Los valores del formulario a partir de los enlaces guardados. */
export function profileLinkValues(links: ProfileLink[]): ProfileLinkValues {
  const find = (kind: ProfileLink["kind"]) =>
    links.find((link) => link.kind === kind)?.url ?? "";
  return {
    instagram: socialDisplay("instagram", find("instagram")),
    tiktok: socialDisplay("tiktok", find("tiktok")),
    facebook: socialDisplay("facebook", find("facebook")),
    pinterest: socialDisplay("pinterest", find("pinterest")),
    website: find("web"),
  };
}
