import { AwsClient } from "aws4fetch";

import { getEnv } from "../lib/env";

/**
 * Almacenamiento de imágenes en Cloudflare R2 (API compatible con S3) — spec §4.
 *
 * Lazy como el resto del proyecto: la configuración se valida recién en la
 * primera operación real, así el build y CI no necesitan credenciales.
 */

export type R2 = {
  client: AwsClient;
  /** Endpoint S3 de la cuenta (la clave del objeto va en el path). */
  endpoint: string;
  bucket: string;
  /** URL base pública para servir las imágenes (r2.dev o dominio propio). */
  publicUrl: string | null;
};

let cached: R2 | undefined;

export function getR2(): R2 {
  if (cached) return cached;

  const env = getEnv();
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Falta configurar Cloudflare R2 (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET) en .env.local — ver .env.example.",
    );
  }

  cached = {
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    }),
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    bucket,
    publicUrl: env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/+$/, "") : null,
  };
  return cached;
}

/** URL firmada S3 de un objeto: sirve para subir, leer y borrar. */
export function objectUrl(key: string): string {
  const r2 = getR2();
  return `${r2.endpoint}/${r2.bucket}/${key}`;
}
