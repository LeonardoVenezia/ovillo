import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Igual que Next.js en desarrollo: .env.local pisa a .env.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
