import { neon } from "@neondatabase/serverless";
import { AwsClient } from "aws4fetch";
import { config } from "dotenv";

/**
 * Acceso puntual a la base para los tests e2e: la limpieza de usuarios de
 * prueba. Igual que los scripts de `db/`, lee `.env.local` y después `.env`
 * (dotenv/config solo lee `.env`).
 */

/** Dominio de los emails de prueba: solo esas cuentas se borran. */
export const TEST_EMAIL_DOMAIN = "ovillo.test";

config({ path: [".env.local", ".env"], quiet: true });

/**
 * Borra los objetos en R2 de las cuentas de prueba (foto grande y miniatura).
 * Es mejor esfuerzo: si falta configuración, avisa y sigue con el borrado en
 * la base.
 */
async function deleteTestObjects(keys: string[]): Promise<void> {
  const {
    R2_ACCOUNT_ID: accountId,
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_BUCKET: bucket,
  } = process.env;
  if (
    keys.length === 0 ||
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket
  ) {
    return;
  }

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });

  for (const key of keys) {
    for (const objectKey of [key, key.replace(/\.jpg$/, "-thumb.jpg")]) {
      await client.fetch(
        `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${objectKey}`,
        { method: "DELETE" },
      );
    }
  }
}

/** Borra las cuentas creadas por los tests (las de email @ovillo.test). */
export async function deleteTestUsers(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Los tests e2e necesitan DATABASE_URL (ver .env.example).");
  }
  const sql = neon(databaseUrl);
  const pattern = `e2e.%@${TEST_EMAIL_DOMAIN}`;

  try {
    const rows = (await sql`
      select i.r2_key from "image" i
      join "user" u on u.id = i.owner_id
      where u.email like ${pattern}
    `) as { r2_key: string }[];
    await deleteTestObjects(rows.map((row) => row.r2_key));
  } catch (error) {
    console.warn("No se pudieron limpiar las fotos de prueba en R2:", error);
  }

  // Antes que las cuentas: lo que la comunidad de prueba propuso al catálogo
  // (si no, quedan lanas y patrones "sin revisar" huérfanos en las listas
  // públicas).
  await sql`
    delete from "yarn"
    where created_by in (select id from "user" where email like ${pattern})
       or brand_id in (
         select id from "yarn_brand"
         where created_by in (select id from "user" where email like ${pattern})
       )
  `;
  await sql`
    delete from "yarn_brand"
    where created_by in (select id from "user" where email like ${pattern})
  `;
  await sql`
    delete from "pattern"
    where created_by in (select id from "user" where email like ${pattern})
  `;

  await sql`delete from "user" where email like ${pattern}`;
}
