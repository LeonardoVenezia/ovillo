import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

/**
 * Acceso puntual a la base para los tests e2e: la limpieza de usuarios de
 * prueba. Igual que los scripts de `db/`, lee `.env.local` y después `.env`
 * (dotenv/config solo lee `.env`).
 */

/** Dominio de los emails de prueba: solo esas cuentas se borran. */
export const TEST_EMAIL_DOMAIN = "ovillo.test";

config({ path: [".env.local", ".env"], quiet: true });

/** Borra las cuentas creadas por los tests (las de email @ovillo.test). */
export async function deleteTestUsers(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Los tests e2e necesitan DATABASE_URL (ver .env.example).");
  }
  const sql = neon(databaseUrl);
  await sql`delete from "user" where email like ${`e2e.%@${TEST_EMAIL_DOMAIN}`}`;
}
