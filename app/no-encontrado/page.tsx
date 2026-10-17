import { notFound } from "next/navigation";

/**
 * Ruta interna para servir un 404 de verdad con el diseño de la app.
 *
 * Con Cache Components el caparazón PPR de una ruta dinámica se sirve (y se
 * cachea) con estado 200 antes de saber si el recurso existe, así que
 * `notFound()` dentro de la página no alcanza: el proxy reescribe acá los
 * `@usuario` inexistentes (ver D-023 y `proxy.ts`).
 */
export default function NotFoundRewritePage() {
  notFound();
}
