import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getEnv } from "@/lib/env";

import * as schema from "./schema";

function createDb() {
  const sql = neon(getEnv().DATABASE_URL);
  return drizzle(sql, { schema, casing: "snake_case" });
}

let instance: ReturnType<typeof createDb> | undefined;

/** Cliente Drizzle lazy: no exige DATABASE_URL durante el build. */
export function getDb() {
  instance ??= createDb();
  return instance;
}
