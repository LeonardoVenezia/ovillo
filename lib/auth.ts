import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { after } from "next/server";

import { getDb } from "../db";
import * as schema from "../db/schema";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { getEnv } from "./env";
import { SITE_NAME } from "./site";

/**
 * Better Auth (spec §4-5.1): email + contraseña por ahora; Google OAuth se
 * suma más adelante (el dueño lo dejó para después).
 *
 * La instancia es **lazy** (`getAuth()`): así el build y el CI no necesitan
 * secretos (decisión D-004). El CLI de Better Auth usa `lib/auth-cli.ts`.
 */

export type Auth = ReturnType<typeof createAuth>;

/** Programa el envío fuera del ciclo de respuesta (no demora el request). */
function scheduleEmail(send: () => Promise<void>): Promise<void> {
  try {
    after(() => send().catch(() => undefined));
  } catch {
    // Fuera de un request (p. ej. un script): enviamos igual, sin esperar.
    void send().catch(() => undefined);
  }
  return Promise.resolve();
}

function createAuth() {
  const env = getEnv();

  // En Vercel cada despliegue tiene su propia URL (previews incluidos).
  const trustedOrigins = [env.BETTER_AUTH_URL, "http://localhost:3000"];
  if (process.env.VERCEL_URL) {
    trustedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }

  return betterAuth({
    appName: SITE_NAME,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // La verificación de email no bloquea navegar: se exige para publicar
      // (se aplica en las fases de contenido). Ver spec §4.
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        scheduleEmail(() =>
          sendPasswordResetEmail({ to: user.email, name: user.name, url }),
        ),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) =>
        scheduleEmail(() =>
          sendVerificationEmail({ to: user.email, name: user.name, url }),
        ),
    },
    plugins: [
      username({ minUsernameLength: 3, maxUsernameLength: 30 }),
      // `nextCookies` siempre último (requisito del plugin).
      nextCookies(),
    ],
    trustedOrigins,
  });
}

let instance: Auth | undefined;

export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
