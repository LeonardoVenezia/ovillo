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

/**
 * Firma con aws4fetch y hace el fetch acá (no con `client.fetch`).
 *
 * `client.fetch` arma un `Request` y lo entrega al `fetch` de Next, que al
 * recibir un `Request` lo reconstruye con el cuerpo como stream: sin largos
 * conocidos, R2 responde 411 (Length Required). Pidiendo la firma y pasando
 * los bytes como init, el `Content-Length` viaja bien.
 */
async function signedFetch(
  key: string,
  init: { method: string; body?: Uint8Array; contentType?: string },
): Promise<Response> {
  const r2 = getR2();
  const signed = await r2.client.sign(objectUrl(key), {
    method: init.method,
    body: init.body as unknown as BodyInit,
    ...(init.contentType
      ? { headers: { "content-type": init.contentType } }
      : {}),
  });
  return fetch(signed.url, {
    method: signed.method,
    headers: signed.headers,
    body: init.body as unknown as BodyInit,
  });
}

/** Sube (o reemplaza) un objeto en el bucket. */
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const response = await signedFetch(key, {
    method: "PUT",
    body,
    contentType,
  });
  if (!response.ok) {
    throw new Error(`R2: no se pudo subir "${key}" (${response.status}).`);
  }
}

/** Borra un objeto; un 404 se considera éxito (ya no estaba). */
export async function deleteObject(key: string): Promise<void> {
  const response = await signedFetch(key, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2: no se pudo borrar "${key}" (${response.status}).`);
  }
}

/**
 * URL pública base, o `null` si todavía no está configurada (así la app
 * degrade con gracia en vez de romper: sin URL, las fotos no se muestran).
 */
export function getPublicUrl(): string | null {
  const value = getEnv().R2_PUBLIC_URL;
  return value ? value.replace(/\/+$/, "") : null;
}
