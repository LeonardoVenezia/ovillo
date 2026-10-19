import { neon } from "@neondatabase/serverless";
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { USERNAME_PATTERN } from "@/features/auth/schemas";
import { getEnv } from "@/lib/env";

/**
 * Middleware de rutas (spec §5.1: "rutas privadas protegidas en servidor").
 *
 * - Perfiles `/@usuario`, proyectos `/@usuario/proyectos/slug`, lanas
 *   (`/lanas/marca/slug`), patrones (`/patrones/slug`), grupos
 *   (`/grupos/slug`) e hilos (`/grupos/slug/hilos/id`): chequea que existan
 *   y, si no, reescribe a la ruta de 404. Hace falta acá porque el caparazón
 *   PPR de las rutas dinámicas se sirve con estado 200 y `notFound()` ya no
 *   puede cambiarlo (ver D-023 y D-031). Ante errores de base se deja pasar:
 *   la página decide.
 * - Rutas privadas: redirección optimista si falta la cookie de sesión; la
 *   validación real (contra la base) la hace cada página con `requireUser()`.
 */

/** Ruta canónica del proyecto público (con arroba; sin ella no se chequea). */
const PROJECT_PATH_PATTERN = /^\/@([^/]+)\/proyectos\/([^/]+)$/;

/** Ficha pública de una lana (`/lanas/marca/slug`). */
const YARN_PATH_PATTERN = /^\/lanas\/([^/]+)\/([^/]+)$/;

/** Edición de una lana propia (`/lanas/marca/slug/editar`). */
const YARN_EDIT_PATH_PATTERN = /^\/lanas\/([^/]+)\/([^/]+)\/editar$/;

/** Ficha pública de un patrón (`/patrones/slug`). */
const PATTERN_PATH_PATTERN = /^\/patrones\/([^/]+)$/;

/** Edición de un patrón propio (`/patrones/slug/editar`). */
const PATTERN_EDIT_PATH_PATTERN = /^\/patrones\/([^/]+)\/editar$/;

/** Ficha pública de un grupo (`/grupos/slug`; `/grupos/nuevo` no es ficha). */
const GROUP_PATH_PATTERN = /^\/grupos\/([^/]+)$/;

/** Edición de un grupo propio (`/grupos/slug/editar`). */
const GROUP_EDIT_PATH_PATTERN = /^\/grupos\/([^/]+)\/editar$/;

/** Hilos de un grupo: listado y ficha (`/grupos/slug/hilos[...]`). */
const GROUP_THREADS_PATH_PATTERN = /^\/grupos\/([^/]+)\/hilos(?:\/([^/]+))?$/;

/** Composición de un hilo (`/grupos/slug/hilos/nuevo`, ruta privada). */
const GROUP_THREADS_NEW_PATH_PATTERN = /^\/grupos\/([^/]+)\/hilos\/nuevo$/;

function decodeSegment(raw: string): string | null {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

async function usernameExists(username: string): Promise<boolean> {
  try {
    const sql = neon(getEnv().DATABASE_URL);
    const rows: unknown[] =
      await sql`select 1 from "user" where username = ${username} limit 1`;
    return rows.length > 0;
  } catch {
    return true;
  }
}

async function projectExists(username: string, slug: string): Promise<boolean> {
  try {
    const sql = neon(getEnv().DATABASE_URL);
    const rows: unknown[] =
      await sql`select 1 from project p join "user" u on u.id = p.user_id where u.username = ${username} and p.slug = ${slug} and p.deleted_at is null limit 1`;
    return rows.length > 0;
  } catch {
    return true;
  }
}

async function yarnExists(
  brandSlug: string,
  yarnSlug: string,
): Promise<boolean> {
  try {
    const sql = neon(getEnv().DATABASE_URL);
    const rows: unknown[] =
      await sql`select 1 from yarn y join yarn_brand b on b.id = y.brand_id where b.slug = ${brandSlug} and y.slug = ${yarnSlug} limit 1`;
    return rows.length > 0;
  } catch {
    return true;
  }
}

async function patternExists(slug: string): Promise<boolean> {
  try {
    const sql = neon(getEnv().DATABASE_URL);
    const rows: unknown[] =
      await sql`select 1 from pattern where slug = ${slug} limit 1`;
    return rows.length > 0;
  } catch {
    return true;
  }
}

async function groupExists(slug: string): Promise<boolean> {
  try {
    const sql = neon(getEnv().DATABASE_URL);
    const rows: unknown[] =
      await sql`select 1 from "group" where slug = ${slug} limit 1`;
    return rows.length > 0;
  } catch {
    return true;
  }
}

async function threadExists(id: string): Promise<boolean> {
  try {
    const sql = neon(getEnv().DATABASE_URL);
    const rows: unknown[] =
      await sql`select 1 from thread where id = ${id} limit 1`;
    return rows.length > 0;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const projectMatch = pathname.match(PROJECT_PATH_PATTERN);
  if (projectMatch) {
    const username = decodeSegment(projectMatch[1])?.trim().toLowerCase() ?? "";
    const slug = decodeSegment(projectMatch[2])?.trim() ?? "";

    if (
      !USERNAME_PATTERN.test(username) ||
      slug.length === 0 ||
      !(await projectExists(username, slug))
    ) {
      return NextResponse.rewrite(new URL("/no-encontrado", request.url));
    }
    return NextResponse.next();
  }

  const yarnMatch = pathname.match(YARN_PATH_PATTERN);
  if (yarnMatch) {
    const brandSlug = decodeSegment(yarnMatch[1])?.trim() ?? "";
    const yarnSlug = decodeSegment(yarnMatch[2])?.trim() ?? "";

    if (
      brandSlug.length === 0 ||
      yarnSlug.length === 0 ||
      !(await yarnExists(brandSlug, yarnSlug))
    ) {
      return NextResponse.rewrite(new URL("/no-encontrado", request.url));
    }
    return NextResponse.next();
  }

  const patternMatch = pathname.match(PATTERN_PATH_PATTERN);
  if (patternMatch) {
    const patternSlug = decodeSegment(patternMatch[1])?.trim() ?? "";

    if (patternSlug.length === 0 || !(await patternExists(patternSlug))) {
      return NextResponse.rewrite(new URL("/no-encontrado", request.url));
    }
    return NextResponse.next();
  }

  const groupMatch = pathname.match(GROUP_PATH_PATTERN);
  if (groupMatch) {
    const groupSlug = decodeSegment(groupMatch[1])?.trim() ?? "";

    // `/grupos/nuevo` es una ruta real, no una ficha: cae al chequeo de
    // rutas privadas de abajo.
    if (groupSlug !== "nuevo") {
      if (groupSlug.length === 0 || !(await groupExists(groupSlug))) {
        return NextResponse.rewrite(new URL("/no-encontrado", request.url));
      }
      return NextResponse.next();
    }
  }

  const threadsMatch = pathname.match(GROUP_THREADS_PATH_PATTERN);
  if (threadsMatch) {
    const groupSlug = decodeSegment(threadsMatch[1])?.trim() ?? "";
    const rest = threadsMatch[2]
      ? (decodeSegment(threadsMatch[2])?.trim() ?? "")
      : null;

    if (groupSlug.length === 0 || !(await groupExists(groupSlug))) {
      return NextResponse.rewrite(new URL("/no-encontrado", request.url));
    }

    if (rest === null) {
      // Listado de hilos del grupo: público.
      return NextResponse.next();
    }
    if (rest !== "nuevo") {
      // Ficha del hilo: el id tiene que existir para responder 404 real.
      if (rest.length === 0 || !(await threadExists(rest))) {
        return NextResponse.rewrite(new URL("/no-encontrado", request.url));
      }
      return NextResponse.next();
    }
    // `/hilos/nuevo` es privada: sigue al chequeo de sesión de abajo.
  }

  if (pathname.startsWith("/@")) {
    const rest = pathname.slice(2);

    // Rutas profundas que no son de proyecto (ej. `/@usuario/proyectos`):
    // que decida el router.
    if (rest.includes("/")) {
      return NextResponse.next();
    }

    const username = decodeSegment(rest)?.trim().toLowerCase() ?? "";
    if (!USERNAME_PATTERN.test(username) || !(await usernameExists(username))) {
      return NextResponse.rewrite(new URL("/no-encontrado", request.url));
    }
    return NextResponse.next();
  }

  // Solo las rutas privadas piden sesión; el matcher corre además para los
  // perfiles de un segmento (`/@usuario`), las lanas y los patrones.
  const isPrivate =
    pathname === "/bienvenida" ||
    pathname === "/explorar/lanas/proponer" ||
    pathname === "/explorar/patrones/proponer" ||
    pathname === "/comunidad/preguntar" ||
    pathname === "/grupos/nuevo" ||
    pathname.startsWith("/mi-tejido") ||
    pathname.startsWith("/contador") ||
    pathname.startsWith("/configuracion") ||
    YARN_EDIT_PATH_PATTERN.test(pathname) ||
    PATTERN_EDIT_PATH_PATTERN.test(pathname) ||
    GROUP_EDIT_PATH_PATTERN.test(pathname) ||
    GROUP_THREADS_NEW_PATH_PATTERN.test(pathname);
  if (!isPrivate) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const signIn = new URL("/ingresar", request.url);
    signIn.searchParams.set(
      "volver",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/mi-tejido/:path*",
    "/contador/:path*",
    "/configuracion/:path*",
    "/bienvenida",
    "/:username",
    "/:username/proyectos/:slug",
    "/lanas/:marca/:slug",
    "/lanas/:marca/:slug/editar",
    "/explorar/lanas/proponer",
    "/patrones/:slug",
    "/patrones/:slug/editar",
    "/explorar/patrones/proponer",
    "/grupos/:slug",
    "/grupos/:slug/editar",
    "/grupos/:slug/hilos",
    "/grupos/:slug/hilos/:thread",
    "/grupos/nuevo",
    "/comunidad/preguntar",
  ],
};
