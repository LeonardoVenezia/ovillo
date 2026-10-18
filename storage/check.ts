import { config } from "dotenv";

import { getR2, objectUrl } from "./index";

// Igual que Next.js en desarrollo: .env.local pisa a .env (dotenv/config solo lee .env).
config({ path: [".env.local", ".env"], quiet: true });

/**
 * Chequeo de Cloudflare R2 (`pnpm storage:check`): sube un objeto de prueba,
 * verifica la lectura pública si hay URL configurada y lo borra.
 */

async function main() {
  const r2 = getR2();
  const key = `pruebas/chequeo-${Date.now()}.txt`;
  const url = objectUrl(key);
  const body = `Ovillo: chequeo de almacenamiento (${new Date().toISOString()})`;

  const put = await r2.client.fetch(url, {
    method: "PUT",
    body,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
  if (!put.ok) {
    throw new Error(`Subida falló (${put.status}): ${await put.text()}`);
  }
  console.log(`Subida OK → bucket "${r2.bucket}"`);

  try {
    if (r2.publicUrl) {
      const publicRes = await fetch(`${r2.publicUrl}/${key}`);
      if (!publicRes.ok) {
        throw new Error(
          `La URL pública responde ${publicRes.status}; revisá R2_PUBLIC_URL y la URL pública del bucket.`,
        );
      }
      console.log("Lectura pública OK (las fotos se verán en la web)");
    } else {
      console.log(
        "Sin R2_PUBLIC_URL: falta activar la URL pública del bucket (Settings → Public Development URL).",
      );
    }
  } finally {
    const del = await r2.client.fetch(url, { method: "DELETE" });
    if (!del.ok) {
      console.error(
        `Aviso: no se pudo borrar el objeto de prueba (${del.status}).`,
      );
    }
  }

  console.log("R2 funcionando.");
}

main().catch((error) => {
  console.error(
    "Chequeo de R2 falló. ¿Están las variables R2_* en .env.local?",
  );
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
