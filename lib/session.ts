import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "./auth";

/**
 * Capa de acceso a la sesión (DAL, spec §9: autorización en servidor).
 *
 * Patrón Next 16 + Cache Components: la lectura del request vive dentro de
 * `use cache: private`, que nunca se cachea en el servidor, y quien la use
 * debe estar debajo de un `<Suspense>` (guía "Authentication with Cache
 * Components"). Los Route Handlers usan `getUserFromRequest`, que no cachea
 * nada. Devolvemos solo los campos que la UI necesita.
 */

export type SessionUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  emailVerified: boolean;
  image: string | null;
};

/** Lo mínimo que usamos de la sesión de Better Auth (tipado estructural). */
type SessionLike = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
  };
} | null;

function toSessionUser(session: SessionLike): SessionUser | null {
  if (!session) {
    return null;
  }

  // El tipo inferido de Better Auth no siempre refleja los campos que agrega
  // el plugin `username`; lo leemos con cuidado.
  const username = (session.user as { username?: string | null }).username;

  return {
    id: session.user.id,
    name: session.user.name,
    username:
      typeof username === "string" && username.length > 0 ? username : null,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
    image: session.user.image ?? null,
  };
}

export async function getOptionalUser(): Promise<SessionUser | null> {
  "use cache: private";

  const session = await getAuth().api.getSession({ headers: await headers() });
  return toSessionUser(session);
}

/** Como `getOptionalUser` pero para Route Handlers (sin cache privada). */
export async function getUserFromRequest(
  request: Request,
): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  return toSessionUser(session);
}

/** Como `getOptionalUser` pero redirige al ingreso si no hay sesión. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/ingresar");
  }
  return user;
}
