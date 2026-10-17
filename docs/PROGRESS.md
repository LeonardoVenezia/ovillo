# PROGRESS — Ovillo

Bitácora de construcción por fases (spec §10: cada fase cierra con tests verdes y una nota acá).
Última actualización: 2026-10-16

## Estado general

- [x] Fase 0 — Repo y documentación
- [ ] Fase 1 — Base del proyecto ← **en curso** (falta conectar Neon y primer deploy)
- [ ] Fase 2 — Cuenta, auth y perfil
- [ ] Fase 3 — Mi tejido (parte 1)
- [ ] Fase 4 — Catálogo (lanas y patrones)
- [ ] Fase 5 — Mi tejido (parte 2)
- [ ] Fase 6 — Comunidad
- [ ] Fase 7 — Social y notificaciones
- [ ] Fase 8 — Moderación, pulido y lanzamiento

## Fase 0 — Repo y documentación (2026-10-16)

Hecho:
- `git init` (rama `main`).
- Spec movida a `docs/SPEC.md` sin editar (fuente de verdad del proyecto).
- `docs/PROGRESS.md` y `docs/DECISIONS.md` creados; `AGENTS.md` con convenciones para agentes.

Pendientes: ninguno.

## Fase 1 — Base del proyecto (en curso)

Hecho:
- Scaffold de **Next.js 16.4** (App Router, TS estricto, Turbopack) + **Tailwind 4** + **shadcn/ui** (preset radix-nova), todo con `pnpm`.
- **Diseño**: paleta cálida de la spec §8 como variables CSS (claro/oscuro), fuentes **Fraunces + Inter**, modo claro/oscuro/sistema. Test automático de **contraste WCAG AA** (24 pares) que lee el CSS real.
- **Navegación de 5 destinos**: header en desktop, barra inferior en mobile con botón central *Crear* (hoja inferior con las 5 acciones, marcadas "Pronto").
- Páginas base: landing, `Explorar`, `Comunidad`, `Mi tejido` (estados vacíos), `Ingresar`/`Registro` (placeholder de Fase 2), 404 en español y `/dev/ui` (solo desarrollo).
- **Calidad**: ESLint + Prettier + `tsc --noEmit` + Vitest; CI listo en `.github/workflows/ci.yml`.
- **Datos**: Neon + Drizzle cableados (cliente lazy, config de migraciones `snake_case`, `pnpm db:check` de humo) + validación de env con Zod (`lib/env.ts`) y `.env.example` completo.
- Build de producción OK: 8 rutas estáticas con **Cache Components** activo.

Pendientes / bloqueos:
- Crear el proyecto en **Neon** y pegar `DATABASE_URL` en `.env.local` (gratis, ~5 min; se hace junto al agente).
- Publicar el repo en **GitHub** para que corra el CI (opcional hasta el primer deploy).
- Cuenta de **Vercel** para el primer deploy (al cerrar la fase).
