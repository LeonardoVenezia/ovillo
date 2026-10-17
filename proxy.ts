import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirección optimista para rutas privadas (spec §5.1: "rutas privadas
 * protegidas en servidor").
 *
 * Acá solo miramos si existe la cookie de sesión para evitar un flash; la
 * validación real (contra la base) la hace cada página con `requireUser()`.
 */
export function proxy(request: NextRequest) {
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
  matcher: ["/mi-tejido/:path*", "/configuracion/:path*", "/bienvenida"],
};
