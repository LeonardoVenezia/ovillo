import { z } from "zod";

/**
 * Validación de variables de entorno (spec §4).
 *
 * A propósito es lazy: `getEnv()` valida en la primera consulta real, así el
 * build (prerender estático) no exige secretos y CI no depende de credenciales.
 * En runtime falla temprano, con un mensaje claro.
 */

const envSchema = z.object({
  /** Neon Postgres — requerido desde la Fase 1 (conexión y migraciones). */
  DATABASE_URL: z.url(),
  /** URL pública del sitio; opcional en desarrollo (lib/site.ts usa localhost). */
  NEXT_PUBLIC_SITE_URL: z.url().optional(),

  // Fase 2: autenticación (Better Auth). Requeridas de acá en adelante.
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),

  // Fase 2 en adelante — se vuelven requeridas cuando cada módulo las use.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (!cached) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(
        `Variables de entorno inválidas:\n${z.prettifyError(result.error)}\n\nRevisá .env.local (ver .env.example).`,
      );
    }
    cached = result.data;
  }
  return cached;
}
