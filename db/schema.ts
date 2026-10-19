/**
 * Esquema de la base de datos (spec §6).
 *
 * Las tablas de Better Auth (`user`, `session`, `account`, `verification`)
 * viven en `db/auth-schema.ts`, generadas con su CLI:
 *
 *   pnpm dlx auth@latest generate --config lib/auth-cli.ts --output db/auth-schema.ts
 *
 * No se editan a mano: para extenderlas se configura en `lib/auth.ts`
 * (plugins, campos adicionales) y se regenera.
 *
 * Las tablas propias viven en archivos por módulo (`profile-schema.ts`, …)
 * y se re-exportan desde acá para Drizzle Kit.
 */
export * from "./auth-schema";
export * from "./profile-schema";
export * from "./project-schema";
export * from "./media-schema";
export * from "./counter-schema";
export * from "./tool-schema";
export * from "./yarn-schema";
export * from "./pattern-schema";
export * from "./stash-schema";
export * from "./queue-schema";
export * from "./saved-schema";
export * from "./goal-schema";
export * from "./community-schema";
export * from "./glossary-schema";
