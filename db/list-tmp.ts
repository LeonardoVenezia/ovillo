/** Temporal: lista los @usuario reales (para verificar el perfil en producción). */
import { config } from "dotenv";
import { desc } from "drizzle-orm";

import { user } from "./auth-schema";
import { getDb } from "./index";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const rows = await getDb()
    .select({
      username: user.username,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(10);
  console.log(JSON.stringify(rows, null, 2));
}

void main();
