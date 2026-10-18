# ESTADO — Ovillo (dónde estamos y qué sigue)

> Snapshot vivo del trabajo, pensado para retomar en cualquier momento (sesión nueva, cambio de máquina, contexto lleno).
> **Se lee al empezar cada sesión y se actualiza al cerrar cada tramo** — aunque la fase no haya terminado, incluso a mitad de una tarea.
> El histórico completo por fase está en `PROGRESS.md`; las decisiones, en `DECISIONS.md`.

Última actualización: **2026-10-18** · Repo limpio y CI en verde (ver "Últimos hitos" al final)
Producción: <https://ovillo-sepia.vercel.app>

## Resumen

- Fases **0 a 3 hechas y cerradas**: base del proyecto, cuentas/perfil, y Mi tejido parte 1 (proyectos, diario, fotos, contador de vueltas y herramientas).
- **Fase 4 — Catálogo, en curso. Tramos 1 y 2 hechos**: catálogo de lanas (38 lanas de 9 marcas reales) y **biblioteca de patrones** (20 patrones gratuitos reales de Revesderecho, Katia y LHO), con fichas, búsqueda con filtros y propuestas de la comunidad (nacen "sin revisar" y visibles al instante). Próximo: **tramo 3 — galerías "hechos por la comunidad" + pulido de búsqueda**.
- El repo quedó **limpio**: todo pusheado a `main`, CI en verde, deploy verificado en producción.

## Próximos pasos (en orden)

1. Leer las secciones de la spec a tocar para el tramo 3: §5.5 y §5.6 (galerías "hechos por la comunidad" y búsqueda) y §6 (relaciones que falten). No editar `SPEC.md`.
2. Fase 4 — Catálogo, tramo 3: **galerías "hechos por la comunidad" y pulido de búsqueda** (relevancia/populares, filtros avanzados). La galería de lanas espera `project_yarn` (Fase 5), igual que la de patrones espera vincular proyectos a patrones. Registrar cada decisión nueva como `D-0xx` en `DECISIONS.md` (la numeración sigue desde D-041).
3. Al cerrar cada tramo: gates (`pnpm typecheck && pnpm lint && pnpm test`; con e2e y `pnpm build` al cerrar fase), actualizar `ESTADO.md` (este archivo) y `PROGRESS.md`, commit + push en español, y verificar el CI (ver "Cómo retomar").

## Pendientes que dependen del dueño (no frenan el código)

- [ ] **Rama de Neon de desarrollo** (D-021) — hace falta antes de abrir el registro al público y para sumar los e2e al CI.
- [ ] **Dominio propio** (decisión de compra, ~USD 10–15/año) — habilita Resend real y una URL mejor (D-018).
- [ ] **Google OAuth** (pospuesto a propósito; D-015).
- [ ] Recorrer `/bienvenida` y el perfil público con su propia cuenta.
- [ ] Recorrer el catálogo en producción (`/explorar/lanas`): probar la búsqueda y los filtros, y proponer una lana real desde `/explorar/lanas/proponer` (queda visible al instante, con el cartel de "sin revisar").
- [ ] Recorrer la biblioteca en producción (`/explorar/patrones`): probar la búsqueda y los filtros, abrir una ficha y ver el botón al patrón original, y sumar un patrón real desde `/explorar/patrones/proponer` (se puede sin confirmar el email; queda "sin revisar").
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
6. Migraciones: siempre `pnpm db:generate` + `pnpm db:migrate` (nunca `drizzle-kit push`). La base compartida ya tiene aplicadas `0000`–`0007`. Los catálogos base se siembran (o actualizan) con `pnpm db:seed-yarns` y `pnpm db:seed-patterns` (los dos idempotentes).

## Últimos hitos (para confirmar que estamos al día)

- `df706b8` — feat(patrones): biblioteca de patrones con propuestas de la comunidad (migración `0007`); CI verde y prod verificado (lista con 20 patrones, búsqueda sin acentos, filtro crochet, ficha con datos verificados y enlace a la fuente, 404 real).
- `af0e8f6` — style(formato): repaso de prettier en herramientas.
- `099e39f` — docs(estado): tramo 1 de lanas cerrado y verificado en producción.
- `9216ce7` — feat(lanas): catálogo base de lanas con propuestas de la comunidad (migración `0006`); CI verde y prod verificado (lista con 38 lanas, ficha, búsqueda sin acentos, 404 real).
- `fdba23a` — docs(estado): sin hash fijo en el encabezado (evita updates por cada commit).
