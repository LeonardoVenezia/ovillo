# DECISIONS — Ovillo

Decisiones técnicas, en orden cronológico (spec §10: ante ambigüedad, decidir y registrar acá en vez de frenar).

## 2026-10-16

- **D-001 — Next.js 16 (App Router), no 15.** Es el LTS activo; Next 15 entra en EOL el 21/10/2026. Turbopack es el default.
- **D-002 — pnpm como gestor de paquetes.** Ya instalado (10.x) en la máquina; reproducible y veloz. Nota: pnpm 10 bloquea scripts `postinstall` por defecto; si una dependencia los necesita (p. ej. `sharp`), correr `pnpm approve-builds`.
- **D-003 — Sin carpeta `src/`.** La estructura sigue la spec §10: `app/`, `components/`, `features/<módulo>/`, `db/`, `lib/`.
- **D-004 — Validación de env con Zod, lazy (`getEnv()` en `lib/env.ts`).** Valida en la primera consulta real: el build y CI no dependen de secretos; en runtime falla temprano con mensaje claro. Por ahora la única requerida es `DATABASE_URL`; las de Fase 2 en adelante se activan cuando su módulo las use.
- **D-005 — Cache Components + Partial Prefetching activos** (default del scaffold de Next 16). Modelo del proyecto: datos públicos compartidos → `"use cache"` + `cacheLife()` + `cacheTag()`; datos por usuario o runtime → `<Suspense>` o `"use cache: private"`; invalidación → `updateTag()` (read-your-writes, desde Server Actions) y `revalidateTag(tag, profile)` (el 2.º argumento es obligatorio en 16). Nada de datos sin cachear fuera de Suspense: el build lo bloquea.
- **D-006 — shadcn/ui con preset `radix-nova`** (Radix como pide la spec; íconos Lucide). La generación nueva usa el paquete unificado `radix-ui` y `cn` (del paquete `cn`) en vez de `clsx` + `tailwind-merge`: no agregar esos dos.
- **D-007 — Tipografías: Fraunces (títulos) + Inter (texto)**, vía `next/font/google` con variables CSS. La spec permitía alternativas; estas mantienen el tono "taller cálido y editorial".
- **D-008 — Modo oscuro con `next-themes`** (clase en `<html>`, default "sistema"). El ícono del toggle se intercambia con `dark:` en CSS en vez de estado de React: evita hydration mismatch y el lint `react-hooks/set-state-in-effect`.
- **D-009 — Base de datos: Drizzle + driver `neon-http`** (`@neondatabase/serverless`), tablas/columnas en `snake_case` (opción `casing` en drizzle-kit y en el cliente), migraciones solo con `generate` + `migrate` (nunca `push`). Los scripts de datos corren con `tsx` + `dotenv`.
- **D-010 — Test de contraste WCAG AA que lee `app/globals.css`.** `lib/design/contrast.test.ts` parsea el CSS real (24 pares, claro y oscuro) y falla si algún par baja de 4.5:1: la paleta no se puede degradar sin que lo note el CI.
- **D-011 — El registro npm por defecto de esta máquina (verdaccio, `~/.npmrc`) da 502 con `drizzle-orm`.** Se instaló (y se actualizará) con `--registry=https://registry.npmjs.org/`. Anotado en `AGENTS.md`.
