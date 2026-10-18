import { createId } from "@paralleldrive/cuid2";

/**
 * Texto para URLs y comparaciones.
 *
 * `slugify` arma el slug público (minúsculas, sin acentos ni símbolos);
 * `normalizeText` deja un texto comparable para búsquedas y detección de
 * duplicados. La versión SQL de esta normalización vive en las consultas
 * (`translate(lower(...), 'áéíóúüñ', 'aeiouun')`): las dos tienen que dar lo
 * mismo para que la búsqueda y el índice funcionen igual.
 */

export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Slug para URLs públicas. Si el texto no deja nada utilizable (ej. emojis),
 * cae en `fallback`.
 */
export function slugify(text: string, fallback: string): string {
  const base = normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || fallback;
}

/** `base`, `base-2`, `base-3`… según lo que esté tomado (primero libre). */
export function firstFreeSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) {
    return base;
  }
  for (let i = 2; i < 100; i += 1) {
    const candidate = `${base}-${i}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  return `${base}-${createId().slice(0, 6)}`;
}
