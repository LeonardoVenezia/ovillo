# Ovillo

Comunidad de tejido en español: dos agujas, crochet y más. Inspirada en Ravelry, más simple, moderna y pensada primero para el celular. _Ovillo_ es el nombre de trabajo (se cambia en un solo lugar: `lib/site.ts`).

**Estado actual: Fase 1 (base del proyecto).** El avance detallado vive en `docs/PROGRESS.md`.

## Stack

Next.js 16 (App Router, Turbopack, Cache Components) · TypeScript estricto · Tailwind CSS 4 + shadcn/ui (Radix) · Neon Postgres + Drizzle ORM · Better Auth (Fase 2) · Resend + React Email (Fase 2) · Cloudflare R2 (Fase 2) · Vercel.

## Puesta en marcha

Requiere Node 20.9+ y pnpm 10.

```bash
pnpm install
cp .env.example .env.local   # completar DATABASE_URL con la connection string de Neon
pnpm dev                     # http://localhost:3000
```

## Comandos

| Comando                                      | Qué hace                             |
| -------------------------------------------- | ------------------------------------ |
| `pnpm dev` / `pnpm build` / `pnpm start`     | Desarrollo / build / producción      |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | Calidad (ESLint, TypeScript, Vitest) |
| `pnpm format`                                | Prettier                             |
| `pnpm db:check`                              | Probar la conexión a Neon            |
| `pnpm db:generate` / `pnpm db:migrate`       | Crear / aplicar migraciones          |
| `pnpm dlx shadcn@latest add <componente>`    | Agregar componentes de UI            |

En desarrollo, `/dev/ui` muestra los tokens y componentes del sistema de diseño.

## Documentación

- `docs/SPEC.md` — especificación del producto (fuente de verdad).
- `docs/PROGRESS.md` — avance por fases.
- `docs/DECISIONS.md` — decisiones técnicas y por qué.
- `AGENTS.md` — convenciones para agentes que trabajan en el repo.
