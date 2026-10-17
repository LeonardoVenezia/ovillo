import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

/**
 * Rutas de Better Auth (`/api/auth/*`).
 *
 * El handler resuelve la instancia en cada request (lazy) para que el build
 * y el CI no necesiten secretos (D-004) y para que el runtime falle temprano
 * y claro si falta configuración.
 */
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler((request) =>
  getAuth().handler(request),
);
