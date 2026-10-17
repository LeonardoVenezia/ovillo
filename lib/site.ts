/**
 * Identidad del sitio (spec §1: nombre provisional, cambiable).
 * Cambiar acá el nombre y quedará reflejado en metadata y UI.
 */
export const SITE_NAME = "Ovillo";

export const SITE_DESCRIPTION =
  "La comunidad de tejido en español: organiza tus proyectos, encuentra patrones y lanas, y teje acompañada. Dos agujas, crochet y otras técnicas textiles.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
