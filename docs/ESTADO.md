# ESTADO — Ovillo (dónde estamos y qué sigue)

> Snapshot vivo del trabajo, pensado para retomar en cualquier momento (sesión nueva, cambio de máquina, contexto lleno).
> **Se lee al empezar cada sesión y se actualiza al cerrar cada tramo** — aunque la fase no haya terminado, incluso a mitad de una tarea.
> El histórico completo por fase está en `PROGRESS.md`; las decisiones, en `DECISIONS.md`.

Última actualización: **2026-10-18** · Repo limpio y CI en verde (ver "Últimos hitos" al final)
Producción: <https://ovillo-sepia.vercel.app>

## Resumen

- Fases **0 a 3 hechas y cerradas**: base del proyecto, cuentas/perfil, y Mi tejido parte 1 (proyectos, diario, fotos, contador de vueltas y herramientas).
- **Próxima: Fase 4 — Catálogo** (spec §5.5 y §5.6): lanas y marcas con seeds, patrones, búsqueda en español con filtros y galerías "hechos por la comunidad". Todavía sin empezar.
- El repo quedó **limpio**: todo pusheado a `main`, CI en verde, deploy verificado en producción. **No hay trabajo a medio terminar.**

## Próximos pasos (en orden)

1. Leer las secciones de la spec a tocar: §5.5 (patrones), §5.6 (base de lanas), §6 (tablas `pattern`, `yarn_brand`, `yarn`) y §9 (rutas de `/explorar`). No editar `SPEC.md`.
2. Fase 4 — Catálogo, sugerencia de orden: primero la **base de lanas** (marcas + lanas + seeds de Argentina, México, España, Chile y Colombia) con su ficha; después **patrones**, y al final **búsqueda con filtros y galerías**. Registrar cada decisión nueva como `D-0xx` en `DECISIONS.md` (la numeración sigue desde D-037).
3. Al cerrar cada tramo: gates (`pnpm typecheck && pnpm lint && pnpm test`; con e2e y `pnpm build` al cerrar fase), actualizar `ESTADO.md` (este archivo) y `PROGRESS.md`, commit + push en español, y verificar el CI (ver "Cómo retomar").

## Pendientes que dependen del dueño (no frenan el código)

- [ ] **Rama de Neon de desarrollo** (D-021) — hace falta antes de abrir el registro al público y para sumar los e2e al CI.
- [ ] **Dominio propio** (decisión de compra, ~USD 10–15/año) — habilita Resend real y una URL mejor (D-018).
- [ ] **Google OAuth** (pospuesto a propósito; D-015).
- [ ] Recorrer `/bienvenida` y el perfil público con su propia cuenta.
- [ ] Antes de abrir el registro: `pnpm db:seed-demo --clean` (borra las cuentas demo, D-034) + rama de Neon.
- [ ] Vercel: el deploy normal sale solo con el push a `main`; no hay CLI autenticada en la máquina (solo el dueño puede tocar cosas del panel).

## Bloqueados

- **e2e en CI**: necesitan la rama de Neon (D-021). Hoy `pnpm test:e2e` corre en local (levanta un dev server propio en el puerto 3100; matar cualquier proceso previo en ese puerto).

## Cuentas y URLs útiles

- Prod: <https://ovillo-sepia.vercel.app> — demo: 5 cuentas `demo.*@ovillo.test` (`mariaruiz`, `candelateje`, `lupitateje`, `solaguirre`, `tomiteje`), contraseña `ovillo-demo-2026`; las crea/re-crea `pnpm db:seed-demo`.
- Repo: `LeonardoVenezia/ovillo` con identidad git propia del proyecto (no cambiar remoto ni identidad sin consultar; D-012).
- CI: <https://github.com/LeonardoVenezia/ovillo/actions> o por API:
  `curl -s "https://api.github.com/repos/LeonardoVenezia/ovillo/actions/runs?per_page=1"`

## Cómo retomar (para el agente)

1. Leer `AGENTS.md` (convenciones), este archivo, y la sección de `docs/SPEC.md` que toque.
2. Confirmar el punto de partida: `git status` limpio, `git log --oneline -5` contra "Últimos hitos".
3. Gates del día a día: `pnpm typecheck && pnpm lint && pnpm test`. Para e2e: `pnpm test:e2e`. Al cerrar fase: `pnpm build`.
4. Probar prefetching/PPR de verdad: build de producción local (`pnpm build && BETTER_AUTH_URL=http://localhost:3200 pnpm start --port 3200`); el e2e corre en dev y no ve esa clase de bugs (D-036).
5. Si `pnpm` falla instalando `drizzle-orm`: usar `--registry=https://registry.npmjs.org/` (D-011).
6. Migraciones: siempre `pnpm db:generate` + `pnpm db:migrate` (nunca `drizzle-kit push`). La base compartida ya tiene aplicadas `0000`–`0005`.

## Últimos hitos (para confirmar que estamos al día)

- `3a51b79` — docs: cierre de la Fase 3 y verificación en producción.
- `8060534` — feat(herramientas): inventario de agujas y ganchos con equivalencias (migración `0005`).
- `f827c24` — fix(auth): ingreso, registro y salida con recarga completa (D-036).
- `6968c89` — feat(contador): contador de vueltas local-first (D-035).
