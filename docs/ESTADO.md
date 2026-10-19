# ESTADO — Ovillo (dónde estamos y qué sigue)

> Snapshot vivo del trabajo, pensado para retomar en cualquier momento (sesión nueva, cambio de máquina, contexto lleno).
> **Se lee al empezar cada sesión y se actualiza al cerrar cada tramo** — aunque la fase no haya terminado, incluso a mitad de una tarea.
> El histórico completo por fase está en `PROGRESS.md`; las decisiones, en `DECISIONS.md`.

Última actualización: **2026-10-19** · Fase 4 (Catálogo) cerrada y verificada; **Fase 5 (Mi tejido, parte 2) completa: tramos 1–4 hechos y verificados en producción** → lo que sigue es la Fase 6 (Comunidad)
Producción: <https://ovillo-sepia.vercel.app>

## Resumen

- Fases **0 a 3 hechas y cerradas**: base del proyecto, cuentas/perfil, y Mi tejido parte 1 (proyectos, diario, fotos, contador de vueltas y herramientas).
- **Fase 4 — Catálogo, cerrada**: tramo 1, catálogo de lanas (38 lanas de 9 marcas reales); tramo 2, **biblioteca de patrones** (20 patrones gratuitos reales de Revesderecho, Katia y LHO) con propuestas de la comunidad; y tramo 3, **vínculo proyecto ↔ patrón con las galerías "hechos por la comunidad"** (ficha del patrón y `/explorar/proyectos`) y **pulido del buscador** (orden relevancia/populares/recientes, filtros avanzados de metraje e idioma y chips de filtros activos).
- El repo quedó **limpio**: todo pusheado a `main`, CI en verde, deploy verificado en producción.
- **Fase 5 — Mi tejido (parte 2), completa**: tramo 1 (inventario de lana) **hecho y verificado en producción** (migración `0009`); tramo 2 (lanas y herramientas en los proyectos, galería "Hechos por la comunidad" en la ficha de lana y filtro "Con mi lana") **hecho y verificado en producción** (migración `0010`); tramo 3 (**Quiero tejer** —cola ordenable con lana planeada, fecha objetivo y notas— y **Guardados y colecciones** —patrones, proyectos y lanas con colecciones públicas en el perfil—) **hecho y verificado en producción** (migración `0011`); y tramo 4 (**Mi año tejiendo**: meta anual de proyectos terminados, resumen del año con metros estimados y lana más usada, y progreso en el perfil público) **hecho y verificado en producción** (migración `0012`).

## Próximos pasos (en orden)

1. **Abrir la Fase 6 — Comunidad** (spec §5.9 y §5.10 + glosario): grupos con roles, hilos con tipos y respuesta solución, "Pedir ayuda" desde un proyecto, KAL/CAL y glosario. Lo primero es leer esas secciones de la spec y planificar los tramos (el detalle queda en `PROGRESS.md` al arrancar).
2. Registrar cada decisión nueva como `D-0xx` en `DECISIONS.md` (los tramos de la Fase 5 usaron D-045 a D-053).
3. Al cerrar cada tramo: gates (`pnpm typecheck && pnpm lint && pnpm test`; con e2e y `pnpm build` al cerrar fase), actualizar `ESTADO.md` (este archivo) y `PROGRESS.md`, commit + push en español, y verificar el CI y el deploy (ver "Cómo retomar").

## Pendientes que dependen del dueño (no frenan el código)

- [ ] **Rama de Neon de desarrollo** (D-021) — hace falta antes de abrir el registro al público y para sumar los e2e al CI.
- [ ] **Dominio propio** (decisión de compra, ~USD 10–15/año) — habilita Resend real y una URL mejor (D-018).
- [ ] **Google OAuth** (pospuesto a propósito; D-015).
- [ ] Recorrer `/bienvenida` y el perfil público con su propia cuenta.
- [ ] Recorrer el catálogo en producción (`/explorar/lanas`): probar la búsqueda y los filtros, y proponer una lana real desde `/explorar/lanas/proponer` (queda visible al instante, con el cartel de "sin revisar").
- [ ] Recorrer la biblioteca en producción (`/explorar/patrones`): probar la búsqueda y los filtros, abrir una ficha y ver el botón al patrón original, y sumar un patrón real desde `/explorar/patrones/proponer` (se puede sin confirmar el email; queda "sin revisar").
- [ ] Recorrer las galerías nuevas: `/explorar/proyectos` (búsqueda, técnica y estado) y una ficha de patrón con proyectos, como `/patrones/malu-hat` (galería "Hechos por la comunidad" y botón "Empezar proyecto"); probar también el orden y los filtros avanzados del buscador de patrones (`/explorar/patrones`: orden populares, "Más filtros" con metraje e idioma).
- [ ] Recorrer en producción las lanas del proyecto: en el sweater de `/@mariaruiz` ver "Lanas del proyecto" (3 de sus 4 ovillos mostaza, disponible 1), la bufanda con la lana del catálogo y el gorro con la lana de la abuela; probar "Con mi lana" en `/explorar/patrones` con la cuenta demo; y mirar una ficha de lana con galería (`/lanas/katia/fil-piuma`, `/lanas/lanas-stop/olaf`).
- [ ] Recorrer en producción el tramo 3 con la cuenta demo: `/mi-tejido/quiero-tejer` (3 patrones; probar el arrastre y las flechas, "Lana y fecha" y "Empezar"), `/mi-tejido/guardados` (7 guardados y dos colecciones; crear una colección, mover y filtrar), los botones "Quiero tejer"/"Guardar" en `/patrones/malu-hat`, `/lanas/katia/fil-piuma` y el sweater de `/@mariaruiz`, y la sección "Guardados" del perfil.
- [ ] Recorrer en producción "Mi año tejiendo": `/mi-tejido/meta` con la cuenta demo (anotar, cambiar y quitar la meta de María —está en 4 y va 1—, ver el resumen con "400 m" y "Fil Piuma · Katia") y la sección nueva en `/@mariaruiz`, `/@candelateje` y `/@lupitateje`.
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
6. Migraciones: siempre `pnpm db:generate` + `pnpm db:migrate` (nunca `drizzle-kit push`). La base compartida ya tiene aplicadas `0000`–`0012`. Los catálogos base se siembran (o actualizan) con `pnpm db:seed-yarns` y `pnpm db:seed-patterns`, y el contenido demo con `pnpm db:seed-demo` (los tres idempotentes; la demo enlaza 3 proyectos a patrones reales, suma 14 lanas de inventario, asigna lanas y herramientas a los proyectos, carga cola/guardados —María queda con 3 en la cola y 2 colecciones— y anota meta anual a María, Candela y Lupita).

## Últimos hitos (para confirmar que estamos al día)

- `495d459` — feat(mi-tejido): meta anual y resumen «Mi año tejiendo» (migración `0012`); CI verde y prod verificado (hub demo con "Mi año tejiendo" y "Vas 1 de 4 proyectos terminados en 2026."; `/mi-tejido/meta` con la tarjeta de meta —"Cambiar meta"/"Quitar meta"— y "Resumen 2026" con "1 proyecto", "400 m" y "Fil Piuma · Katia"; `/@mariaruiz`, `/@candelateje` (Vas 1 de 3) y `/@lupitateje` (Vas 1 de 2, "125 m") con la sección nueva; `/@tomiteje` sin sección por no tener meta ni terminados; y `/mi-tejido/meta` sin sesión con 307 a `/ingresar?volver=`).
- `8773b2f` — feat(mi-tejido): Quiero tejer y Guardados con colecciones (migración `0011`); CI verde y prod verificado (hub con "Tenés 3 patrones en la cola" y "Tenés 7 cosas guardadas"; `/mi-tejido/quiero-tejer` con los tres patrones demo, la merino mostaza planeada, su nota y "Para el 03/12/2026"; `/mi-tejido/guardados` con "Para el invierno" (pública, 3) e "Ideas para regalar" (privada, 4); botones "Quiero tejer"/"Guardar" en `/patrones/malu-hat`, `/lanas/katia/fil-piuma` y el sweater público; `/@mariaruiz` con la sección "Guardados"; rutas privadas con 307 y vuelta).

- `f3498da` — feat(proyectos): lanas y herramientas del proyecto, galería "Hechos por la comunidad" en la ficha de lana y filtro "Con mi lana" (migración `0010`); CI verde y prod verificado (sweater de María con "Lanas del proyecto" y "Agujas y ganchos", los descuentos en `/mi-tejido/lanas` —"Disponible: 1 de 4 ovillos" mostaza, "2 de 3" la de la abuela, "1 de 1" Fil Piuma que la bufanda del catálogo dejó libre—, "Con mi lana" devolviendo la Bufanda fácil en Fil Piuma, y galerías en `/lanas/katia/fil-piuma` y `/lanas/lanas-stop/olaf`).
- `eba93a5` — feat(inventario): inventario de lana con disponible calculada y foto (migración `0009`); CI verde y prod verificado (hub con "Tenés 5 lanas guardadas en el inventario, 10 ovillos en total" en la cuenta demo, `/mi-tejido/lanas` con las 5 lanas demo —Fil Piuma "Verde agua", "Disponible: 1 de 1 ovillo", carga libre "Lana de mi abuela", ubicación—, foto propia servida desde R2 (`/lanas/…`), formulario abierto con `?nueva=1` y las rutas privadas redirigiendo con la vuelta).
- `e53d4dc` — feat(proyectos): vínculo con la biblioteca de patrones, galerías de la comunidad y pulido de búsqueda (migración `0008`); CI verde y prod verificado (`/explorar/proyectos` con los proyectos demo, galerías en Malu Hat / Bufanda fácil en Fil Piuma / Oso Toño, galería vacía honesta en el Chaleco XL, orden populares y filtros avanzados respondiendo, 307 con la vuelta en la ruta privada).
- `64c9aa7` — docs(estado): tramo 2 de patrones cerrado y verificado en producción.
- `df706b8` — feat(patrones): biblioteca de patrones con propuestas de la comunidad (migración `0007`); CI verde y prod verificado (lista con 20 patrones, búsqueda sin acentos, filtro crochet, ficha con datos verificados y enlace a la fuente, 404 real).
- `af0e8f6` — style(formato): repaso de prettier en herramientas.
- `099e39f` — docs(estado): tramo 1 de lanas cerrado y verificado en producción.
