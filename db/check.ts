import { config } from "dotenv";
import { sql } from "drizzle-orm";

import { getDb } from "./index";

// Igual que Next.js en desarrollo: .env.local pisa a .env (dotenv/config solo lee .env).
config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const db = getDb();
  const result = await db.execute(sql`select 1 as ok`);
  console.log("Conexión a la base OK:", result.rows[0]);
}

main().catch((error) => {
  console.error(
    "No se pudo conectar a la base. ¿Está DATABASE_URL en .env.local?",
  );
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
