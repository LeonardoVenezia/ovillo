/**
 * Ayudas del buscador compartidas por el catálogo (patrones) y la galería
 * de proyectos: la búsqueda siempre es texto literal, nunca comodines.
 */

/** Envuelve el texto para un `ILIKE`, escapando `%`, `_` y `\`. */
export function likeContains(query: string): string {
  return `%${query.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}
