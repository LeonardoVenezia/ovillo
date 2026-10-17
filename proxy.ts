import { neon } from "@neondatabase/serverless";
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { USERNAME_PATTERN } from "@/features/auth/schemas";
import { getEnv } from "@/lib/env";

/**
 * Middleware de rutas (spec §5.1: "rutas privadas protegidas en servidor").
 *
 * - Perfiles `/@usuario`: chequea que la cuenta exista y, si no, reescribe a
 *   la ruta de 404. Hace falta acá porque el caparazón PPR de la ruta
 *   dinámica se sirve con estado 200 y `notFound()` ya no puede cambiarlo
 *   (ver D-023). Ante errores de base se deja pasar: la página decide.
 * - Rutas privadas: redirección optimista si falta la cookie de sesión; la
 *   validación real (contra la base) la hace cada página con `requireUser()`.
 */

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/@")) {
    let username = "";
    try {
      username = decodeURIComponent(pathname.slice(2)).trim().toLowerCase();
    } catch {
      username = "";
    }

    if (!USERNAME_PATTERN.test(username) || !(await usernameExists(username))) {
      return NextResponse.rewrite(new URL("/no-encontrado", request.url));
    }
    return NextResponse.next();
  }

  // Solo las rutas privadas piden sesión; el matcher corre además para los
  // perfiles de un segmento (`/@usuario`).
  const isPrivate =
    pathname === "/bienvenida" ||
    pathname.startsWith("/mi-tejido") ||
    pathname.startsWith("/configuracion");
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
    "/configuracion/:path*",
    "/bienvenida",
    "/:username",
  ],
};
