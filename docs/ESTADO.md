# ESTADO — Ovillo (dónde estamos y qué sigue)

> Snapshot vivo del trabajo, pensado para retomar en cualquier momento (sesión nueva, cambio de máquina, contexto lleno).
> **Se lee al empezar cada sesión y se actualiza al cerrar cada tramo** — aunque la fase no haya terminado, incluso a mitad de una tarea.
> El histórico completo por fase está en `PROGRESS.md`; las decisiones, en `DECISIONS.md`.

Última actualización: **2026-10-18** · Fase 4 (Catálogo) cerrada y verificada; **Fase 5 (Mi tejido, parte 2) en curso: tramo 1 (inventario de lana) construido, verificación en producción pendiente**
Producción: <https://ovillo-sepia.vercel.app>

## Resumen

- Fases **0 a 3 hechas y cerradas**: base del proyecto, cuentas/perfil, y Mi tejido parte 1 (proyectos, diario, fotos, contador de vueltas y herramientas).
- **Fase 4 — Catálogo, cerrada**: tramo 1, catálogo de lanas (38 lanas de 9 marcas reales); tramo 2, **biblioteca de patrones** (20 patrones gratuitos reales de Revesderecho, Katia y LHO) con propuestas de la comunidad; y tramo 3, **vínculo proyecto ↔ patrón con las galerías "hechos por la comunidad"** (ficha del patrón y `/explorar/proyectos`) y **pulido del buscador** (orden relevancia/populares/recientes, filtros avanzados de metraje e idioma y chips de filtros activos).
- El repo quedó **limpio**: todo pusheado a `main`, CI en verde, deploy verificado en producción.
- **Fase 5 — Mi tejido (parte 2), en curso**: tramo 1 (inventario de lana) construido —`stash_item` + `project_yarn` en la migración `0009`, `/mi-tejido/lanas` con "disponible = total − asignada" ya calculada, foto opcional, filtros por color/grosor, hub y hoja *Crear*, y 14 lanas demo—; queda verificar en producción. Plan: **2)** lanas en los proyectos (asignar del inventario o del catálogo, devolución al frogear/editar, `project_tool`, galería "Hechos por la comunidad" en la ficha de lana y filtro "Con mi lana"); **3)** Quiero tejer + Guardados y colecciones; **4)** meta anual.

## Próximos pasos (en orden)

1. **Fase 5 — tramo 1: cerrar la verificación en producción**: esperar el CI del push del inventario, ver con `curl` que `/mi-tejido/lanas` redirige sin sesión y que prod está en el commit nuevo; dejar anotado en PROGRESS/ESTADO.
2. **Fase 5 — tramo 2: lanas en los proyectos** (spec §5.3): sección "Lanas" en el detalle del proyecto para asignar del inventario (con la disponible en vivo) o del catálogo, con el descuento visible y la devolución al frogear/editar (ya garantizada por `project_yarn`); más `project_tool`, la galería "Hechos por la comunidad" en la ficha de la lana y el filtro "Con mi lana" en `/explorar/patrones`.
3. Registrar cada decisión nueva como `D-0xx` en `DECISIONS.md` (el tramo 1 usó D-045 y D-046).
4. Al cerrar cada tramo: gates (`pnpm typecheck && pnpm lint && pnpm test`; con e2e y `pnpm build` al cerrar fase), actualizar `ESTADO.md` (este archivo) y `PROGRESS.md`, commit + push en español, y verificar el CI (ver "Cómo retomar").

## Pendientes que dependen del dueño (no frenan el código)

- [ ] **Rama de Neon de desarrollo** (D-021) — hace falta antes de abrir el registro al público y para sumar los e2e al CI.
- [ ] **Dominio propio** (decisión de compra, ~USD 10–15/año) — habilita Resend real y una URL mejor (D-018).
- [ ] **Google OAuth** (pospuesto a propósito; D-015).
- [ ] Recorrer `/bienvenida` y el perfil público con su propia cuenta.
- [ ] Recorrer el catálogo en producción (`/explorar/lanas`): probar la búsqueda y los filtros, y proponer una lana real desde `/explorar/lanas/proponer` (queda visible al instante, con el cartel de "sin revisar").
- [ ] Recorrer la biblioteca en producción (`/explorar/patrones`): probar la búsqueda y los filtros, abrir una ficha y ver el botón al patrón original, y sumar un patrón real desde `/explorar/patrones/proponer` (se puede sin confirmar el email; queda "sin revisar").
- [ ] Recorrer las galerías nuevas: `/explorar/proyectos` (búsqueda, técnica y estado) y una ficha de patrón con proyectos, como `/patrones/malu-hat` (galería "Hechos por la comunidad" y botón "Empezar proyecto"); probar también el orden y los filtros avanzados del buscador de patrones (`/explorar/patrones`: orden populares, "Más filtros" con metraje e idioma).
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
6. Migraciones: siempre `pnpm db:generate` + `pnpm db:migrate` (nunca `drizzle-kit push`). La base compartida ya tiene aplicadas `0000`–`0009`. Los catálogos base se siembran (o actualizan) con `pnpm db:seed-yarns` y `pnpm db:seed-patterns`, y el contenido demo con `pnpm db:seed-demo` (los tres idempotentes; la demo enlaza 3 proyectos a patrones reales y suma 14 lanas de inventario).

## Últimos hitos (para confirmar que estamos al día)

- `e53d4dc` — feat(proyectos): vínculo con la biblioteca de patrones, galerías de la comunidad y pulido de búsqueda (migración `0008`); CI verde y prod verificado (`/explorar/proyectos` con los proyectos demo, galerías en Malu Hat / Bufanda fácil en Fil Piuma / Oso Toño, galería vacía honesta en el Chaleco XL, orden populares y filtros avanzados respondiendo, 307 con la vuelta en la ruta privada).
- `64c9aa7` — docs(estado): tramo 2 de patrones cerrado y verificado en producción.
- `df706b8` — feat(patrones): biblioteca de patrones con propuestas de la comunidad (migración `0007`); CI verde y prod verificado (lista con 20 patrones, búsqueda sin acentos, filtro crochet, ficha con datos verificados y enlace a la fuente, 404 real).
- `af0e8f6` — style(formato): repaso de prettier en herramientas.
- `099e39f` — docs(estado): tramo 1 de lanas cerrado y verificado en producción.
