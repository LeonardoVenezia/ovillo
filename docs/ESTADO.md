# ESTADO — Ovillo (dónde estamos y qué sigue)

> Snapshot vivo del trabajo, pensado para retomar en cualquier momento (sesión nueva, cambio de máquina, contexto lleno).
> **Se lee al empezar cada sesión y se actualiza al cerrar cada tramo** — aunque la fase no haya terminado, incluso a mitad de una tarea.
> El histórico completo por fase está en `PROGRESS.md`; las decisiones, en `DECISIONS.md`.

Última actualización: **2026-10-19** · **Fase 6 (Comunidad) completa y verificada en producción** (tramos 1–3: grupos y membresía, hilos y respuestas, y KAL/CAL + glosario) → lo que sigue es la Fase 7 (social y notificaciones)
Producción: <https://ovillo-sepia.vercel.app>

## Resumen

- Fases **0 a 3 hechas y cerradas**: base del proyecto, cuentas/perfil, y Mi tejido parte 1 (proyectos, diario, fotos, contador de vueltas y herramientas).
- **Fase 4 — Catálogo, cerrada**: tramo 1, catálogo de lanas (38 lanas de 9 marcas reales); tramo 2, **biblioteca de patrones** (20 patrones gratuitos reales de Revesderecho, Katia y LHO) con propuestas de la comunidad; y tramo 3, **vínculo proyecto ↔ patrón con las galerías "hechos por la comunidad"** (ficha del patrón y `/explorar/proyectos`) y **pulido del buscador** (orden relevancia/populares/recientes, filtros avanzados de metraje e idioma y chips de filtros activos).
- El repo quedó **limpio**: todo pusheado a `main`, CI en verde, deploy verificado en producción.
- **Fase 5 — Mi tejido (parte 2), completa**: tramo 1 (inventario de lana) **hecho y verificado en producción** (migración `0009`); tramo 2 (lanas y herramientas en los proyectos, galería "Hechos por la comunidad" en la ficha de lana y filtro "Con mi lana") **hecho y verificado en producción** (migración `0010`); tramo 3 (**Quiero tejer** —cola ordenable con lana planeada, fecha objetivo y notas— y **Guardados y colecciones** —patrones, proyectos y lanas con colecciones públicas en el perfil—) **hecho y verificado en producción** (migración `0011`); y tramo 4 (**Mi año tejiendo**: meta anual de proyectos terminados, resumen del año con metros estimados y lana más usada, y progreso en el perfil público) **hecho y verificado en producción** (migración `0012`).
- **Fase 6 — Comunidad, completa y verificada en producción.** Tramo 1 (grupos y membresía) (migración `0013`): grupos con categoría, reglas, portada y política de ingreso (`abierto` o `aprobacion`); membresía con roles (`dueño`/`moderador`/`miembro`) y solicitudes que los moderadores aceptan o rechazan; hub `/comunidad`, directorio con búsqueda sin acentos y 6 grupos oficiales sembrados (cuenta nueva **Equipo Ovillo**). Tramo 2 (hilos y respuestas) (migración `0014`): hilos con cuatro tipos (pregunta, charla, muestro, anuncio), respuestas planas con fotos, solución marcada por quien preguntó o la moderación, fijar/cerrar para moderación y "Pedir ayuda" desde un proyecto propio; "Hilos recientes" y "Preguntas sin responder" en `/comunidad`. **Tramo 3 (KAL/CAL y glosario) hecho y verificado en producción** (migración `0015`): **KAL/CAL** dentro del grupo —los organiza la moderación, nacen con su hilo propio sincronizado, tienen fechas (el estado se deriva: próximo/en curso/terminado), hasta 4 patrones de la biblioteca, hasta 8 etapas, participantes con su proyecto propio (cambiable y salible, con "terminaron" derivado) y la conversación en el hilo del evento; "Tejidos en conjunto" en `/comunidad`— y **glosario** público (`/glosario`) con 44 términos base de dos agujas, crochet y comunes (abreviatura, inglés y variantes por país), búsqueda sin acentos por término/abreviatura/inglés/definición/variante y filtros por técnica —la primera caché compartida de la comunidad y el sinónimo para la búsqueda global de la Fase 7—. Sigue la **Fase 7 (social y notificaciones)**: seguir y feed, Descubrir, comentarios y reacciones, notificaciones en app y por email, mensajes privados y búsqueda global.

## Próximos pasos (en orden)

1. **Empezar la Fase 7 — Social y notificaciones** (spec §5.11–§5.13): seguir y feed, Descubrir, comentarios y reacciones, menciones, notificaciones en app y por email, mensajes privados y búsqueda global (que aprovecha los sinónimos del glosario). El detalle de los tramos está en `PROGRESS.md`.
2. Registrar cada decisión nueva como `D-0xx` en `DECISIONS.md` (la Fase 6 usó D-054 a D-057).
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
- [ ] Recorrer en producción la comunidad (tramo 1): `/comunidad` y `/grupos` (búsqueda y chips de categoría), entrar y salir de un grupo con la cuenta demo, y aprobar la solicitud pendiente de Sol en `/grupos/sugerencias-para-ovillo` (María la modera).
- [ ] Recorrer los hilos en producción: `/comunidad` ("Hilos recientes" y "Preguntas sin responder"), abrir `/grupos/ayuda-para-principiantes` (la pregunta resuelta de María con el sweater adjunto), responder un hilo con la cuenta demo, probar "Pedir ayuda" desde un proyecto propio de María y mirar el muestro con foto de Lupita en `/grupos/dos-agujas`.
- [ ] Recorrer los KAL/CAL y el glosario en producción: `/comunidad` ("Tejidos en conjunto") y `/grupos/dos-agujas/eventos` (el KAL de María "En curso" con "1 de 2 terminaron", etapas y patrón); abrir el CAL de amigurumis por empezar y probar "Sumarme" con un proyecto propio de la cuenta demo (cambiar de proyecto y salir); y en `/glosario` buscar "liso", "2 pj" y "k2tog" y filtrar por Crochet.
- [ ] Antes de abrir el registro: `pnpm db:seed-demo --clean` (borra las cuentas demo, D-034) + rama de Neon.
- [ ] Vercel: el deploy normal sale solo con el push a `main`; no hay CLI autenticada en la máquina (solo el dueño puede tocar cosas del panel).

## Bloqueados

- **e2e en CI**: necesitan la rama de Neon (D-021). Hoy `pnpm test:e2e` corre en local (levanta un dev server propio en el puerto 3100; matar cualquier proceso previo en ese puerto).

## Cuentas y URLs útiles

- Prod: <https://ovillo-sepia.vercel.app> — demo: 6 cuentas `demo.*@ovillo.test` (`mariaruiz`, `candelateje`, `lupitateje`, `solaguirre`, `tomiteje`, `ovillo` —«Equipo Ovillo», dueña de los grupos oficiales—), contraseña `ovillo-demo-2026`; las crea/re-crea `pnpm db:seed-demo`.
- Repo: `LeonardoVenezia/ovillo` con identidad git propia del proyecto (no cambiar remoto ni identidad sin consultar; D-012).
- CI: <https://github.com/LeonardoVenezia/ovillo/actions> o por API:
  `curl -s "https://api.github.com/repos/LeonardoVenezia/ovillo/actions/runs?per_page=1"`

## Cómo retomar (para el agente)

1. Leer `AGENTS.md` (convenciones), este archivo, y la sección de `docs/SPEC.md` que toque.
2. Confirmar el punto de partida: `git status` limpio, `git log --oneline -5` contra "Últimos hitos".
3. Gates del día a día: `pnpm typecheck && pnpm lint && pnpm test`. Para e2e: `pnpm test:e2e`. Al cerrar fase: `pnpm build`.
4. Probar prefetching/PPR de verdad: build de producción local (`pnpm build && BETTER_AUTH_URL=http://localhost:3200 pnpm start --port 3200`); el e2e corre en dev y no ve esa clase de bugs (D-036).
5. Si `pnpm` falla instalando `drizzle-orm`: usar `--registry=https://registry.npmjs.org/` (D-011).
6. Migraciones: siempre `pnpm db:generate` + `pnpm db:migrate` (nunca `drizzle-kit push`). La base compartida ya tiene aplicadas `0000`–`0015`. Los catálogos base se siembran (o actualizan) con `pnpm db:seed-yarns` y `pnpm db:seed-patterns`, y el contenido demo con `pnpm db:seed-demo` (los tres idempotentes; la demo enlaza 3 proyectos a patrones reales, suma 14 lanas de inventario, asigna lanas y herramientas a los proyectos, carga cola/guardados —María queda con 3 en la cola y 2 colecciones—, anota meta anual a María, Candela y Lupita y siembra la comunidad —Equipo Ovillo con 6 grupos oficiales, membresías, 7 hilos con 8 respuestas, 3 KAL/CAL con sus hilos y 4 participaciones, y 44 términos de glosario—).

## Últimos hitos (para confirmar que estamos al día)

- `f121230` — feat(comunidad): KAL/CAL y glosario (migración `0015`); CI verde y prod verificado (`/glosario` con 44 términos y las búsquedas "liso" —Punto jersey, con "En España: punto liso"— y "2 pj" respondiendo, el filtro por Crochet dejando afuera los términos de dos agujas y un vacío honesto; `/comunidad` con "Tejidos en conjunto" y la tarjeta del glosario; `/grupos/dos-agujas` y `/grupos/dos-agujas/eventos` con el KAL de María "En curso" —"1 de 2 terminaron", "Etapa 1", Cardigan Dreams—; 404 real para un evento y un grupo inexistentes y `/grupos/dos-agujas/eventos/nuevo` sin sesión con 307 a `/ingresar?volver=%2Fgrupos%2Fdos-agujas%2Feventos%2Fnuevo`).
- `70d5ff2` — feat(comunidad): hilos y respuestas (migración `0014`); CI verde y prod verificado (`/comunidad` con "Hilos recientes" y "Preguntas sin responder"; `/grupos/ayuda-para-principiantes` con sus dos hilos y la pregunta resuelta de María mostrando "Resuelta"/"Solución" y la tarjeta del sweater enlazando a `/@mariaruiz/proyectos/sweater-otono`; un hilo inexistente da 404 real y `/comunidad/preguntar` sin sesión va con 307 a `/ingresar?volver=%2Fcomunidad%2Fpreguntar`).
- `6739410` — feat(comunidad): grupos y membresía (migración `0013`); CI verde y prod verificado (`/comunidad` y `/grupos` con los 6 grupos oficiales y "6 grupos", un slug inexistente da 404 real y `/grupos/nuevo` sin sesión va con 307 a `/ingresar?volver=%2Fgrupos%2Fnuevo`; con la cuenta demo, "Tus grupos" con sus dos moderaciones y `/grupos/sugerencias-para-ovillo` con la solicitud pendiente de Sol y los botones Aceptar/Rechazar).
- `b0d9137` — style(formato): pase de prettier en los tramos anteriores.
- `495d459` — feat(mi-tejido): meta anual y resumen «Mi año tejiendo» (migración `0012`); CI verde y prod verificado (hub demo con "Mi año tejiendo" y "Vas 1 de 4 proyectos terminados en 2026."; `/mi-tejido/meta` con la tarjeta de meta —"Cambiar meta"/"Quitar meta"— y "Resumen 2026" con "1 proyecto", "400 m" y "Fil Piuma · Katia"; `/@mariaruiz`, `/@candelateje` (Vas 1 de 3) y `/@lupitateje` (Vas 1 de 2, "125 m") con la sección nueva; `/@tomiteje` sin sección por no tener meta ni terminados; y `/mi-tejido/meta` sin sesión con 307 a `/ingresar?volver=`).
- `8773b2f` — feat(mi-tejido): Quiero tejer y Guardados con colecciones (migración `0011`); CI verde y prod verificado (hub con "Tenés 3 patrones en la cola" y "Tenés 7 cosas guardadas"; `/mi-tejido/quiero-tejer` con los tres patrones demo, la merino mostaza planeada, su nota y "Para el 03/12/2026"; `/mi-tejido/guardados` con "Para el invierno" (pública, 3) e "Ideas para regalar" (privada, 4); botones "Quiero tejer"/"Guardar" en `/patrones/malu-hat`, `/lanas/katia/fil-piuma` y el sweater público; `/@mariaruiz` con la sección "Guardados"; rutas privadas con 307 y vuelta).

- `f3498da` — feat(proyectos): lanas y herramientas del proyecto, galería "Hechos por la comunidad" en la ficha de lana y filtro "Con mi lana" (migración `0010`); CI verde y prod verificado (sweater de María con "Lanas del proyecto" y "Agujas y ganchos", los descuentos en `/mi-tejido/lanas` —"Disponible: 1 de 4 ovillos" mostaza, "2 de 3" la de la abuela, "1 de 1" Fil Piuma que la bufanda del catálogo dejó libre—, "Con mi lana" devolviendo la Bufanda fácil en Fil Piuma, y galerías en `/lanas/katia/fil-piuma` y `/lanas/lanas-stop/olaf`).
- `eba93a5` — feat(inventario): inventario de lana con disponible calculada y foto (migración `0009`); CI verde y prod verificado (hub con "Tenés 5 lanas guardadas en el inventario, 10 ovillos en total" en la cuenta demo, `/mi-tejido/lanas` con las 5 lanas demo —Fil Piuma "Verde agua", "Disponible: 1 de 1 ovillo", carga libre "Lana de mi abuela", ubicación—, foto propia servida desde R2 (`/lanas/…`), formulario abierto con `?nueva=1` y las rutas privadas redirigiendo con la vuelta).
- `e53d4dc` — feat(proyectos): vínculo con la biblioteca de patrones, galerías de la comunidad y pulido de búsqueda (migración `0008`); CI verde y prod verificado (`/explorar/proyectos` con los proyectos demo, galerías en Malu Hat / Bufanda fácil en Fil Piuma / Oso Toño, galería vacía honesta en el Chaleco XL, orden populares y filtros avanzados respondiendo, 307 con la vuelta en la ruta privada).
- `64c9aa7` — docs(estado): tramo 2 de patrones cerrado y verificado en producción.
- `df706b8` — feat(patrones): biblioteca de patrones con propuestas de la comunidad (migración `0007`); CI verde y prod verificado (lista con 20 patrones, búsqueda sin acentos, filtro crochet, ficha con datos verificados y enlace a la fuente, 404 real).
- `af0e8f6` — style(formato): repaso de prettier en herramientas.
- `099e39f` — docs(estado): tramo 1 de lanas cerrado y verificado en producción.
