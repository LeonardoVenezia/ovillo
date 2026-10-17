/**
 * Solo deja pasar rutas internas ("/mi-tejido"), nunca URLs externas ni
 * "//sitio-falso.com" (evita redirecciones abiertas).
 */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}
