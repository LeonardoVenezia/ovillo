# PROGRESS — Ovillo

Bitácora de construcción por fases (spec §10: cada fase cierra con tests verdes y una nota acá).
Última actualización: 2026-10-18

## Estado general

- [x] Fase 0 — Repo y documentación
- [x] Fase 1 — Base del proyecto (deploy en Vercel + base Neon conectada)
- [x] Fase 2 — Cuenta, auth y perfil (cerrada con pendientes diferidos a propósito)
- [x] Fase 3 — Mi tejido (parte 1) — cerrada (proyectos, diario, fotos, contador y herramientas)
- [ ] Fase 4 — Catálogo (lanas y patrones) ← próxima
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

## Fase 1 — Base del proyecto (2026-10-16 → 17)

Hecho:
- Scaffold de **Next.js 16.4** (App Router, TS estricto, Turbopack) + **Tailwind 4** + **shadcn/ui** (preset radix-nova), todo con `pnpm`.
- **Diseño**: paleta cálida de la spec §8 como variables CSS (claro/oscuro), fuentes **Fraunces + Inter**, modo claro/oscuro/sistema. Test automático de **contraste WCAG AA** (24 pares) que lee el CSS real.
- **Navegación de 5 destinos**: header en desktop, barra inferior en mobile con botón central *Crear* (hoja inferior con las 5 acciones, marcadas "Pronto").
- Páginas base: landing, `Explorar`, `Comunidad`, `Mi tejido` (estados vacíos), `Ingresar`/`Registro` (placeholder de Fase 2), 404 en español y `/dev/ui` (solo desarrollo).
- **Calidad**: ESLint + Prettier + `tsc --noEmit` (con `next typegen` previo) + Vitest; **CI activo en GitHub** (`.github/workflows/ci.yml`): typecheck + lint + test + build en cada push, en verde.
- **GitHub**: repo publicado en la cuenta personal `LeonardoVenezia` (identidad git por proyecto, ver D-012); todo el historial con commits firmados como el dueño.
- **Deploy**: sitio publicado en Vercel (plan Hobby) — <https://ovillo-sepia.vercel.app>.
- **Base de datos**: Neon creada desde Vercel (integración gestionada, ver D-014), conectada a los 3 entornos; `DATABASE_URL` local en `.env.local` y `pnpm db:check` en verde contra la base real.
- **Datos**: Neon + Drizzle cableados (cliente lazy, config de migraciones `snake_case`, `pnpm db:check` de humo) + validación de env con Zod (`lib/env.ts`) y `.env.example` completo.
- Build de producción OK: 8 rutas estáticas con **Cache Components** activo.

Pendientes: ninguno. Próxima fase: **Fase 2 — Cuenta, auth y perfil**.

## Fase 2 — Cuenta, auth y perfil (2026-10-17 → )

Decisión de arranque: primero **email + contraseña**; Google OAuth queda para más adelante (pedido del dueño). La cuenta de Resend ya existe (modo de prueba hasta tener dominio, ver D-018).

Hecho (código completo, probado localmente contra Neon):
- **Better Auth** con email + contraseña y plugin `username` (el @usuario único de la spec), sobre Drizzle/Neon. Primera migración real aplicada: `user`, `session`, `account`, `verification`.
- **Pantallas de cuenta**: `/registro` (disponibilidad de @usuario en vivo + aceptación de normas), `/ingresar` (con email **o** @usuario, y respeta `?volver=`), `/recuperar`, `/restablecer` (token del email), verificación de email por enlace directo (vuelve a Mi tejido con aviso de confirmación) y `/configuracion` (datos de la cuenta, reenviar verificación, cambiar contraseña cerrando otras sesiones, cerrar sesión).
- **Encabezado con menú de usuario** (avatar con iniciales mientras no haya subida de imágenes): Mi tejido, Configuración, Cerrar sesión. Al no tener sesión: Ingresar + Crear cuenta.
- **Rutas privadas protegidas de verdad**: redirección optimista en `proxy.ts` + validación server-side contra la base en cada página (D-019). La verificación de email no bloquea navegar (se exigirá para publicar, spec §4).
- **Emails** de verificación y recuperación con Resend + plantillas propias en español (D-017); sin clave configurada se registran en consola.
- **`/normas`** publicada con el resumen de convivencia (lo acepta el registro).
- **Calidad**: typecheck + lint + **36 tests** en verde; `pnpm build` verificado **sin `.env.local`** (build/CI sin secretos). Prueba de humo real contra Neon: registro, sesión, ingreso por @usuario, página privada con y sin cookie, reenvío de verificación, cierre de sesión; la cuenta de prueba se borró al terminar.

Hecho (bienvenida y perfil, mismo día):
- **Bienvenida (`/bienvenida`)**: asistente salteable de 2 pasos (técnicas + nivel; país/región + ciudad opcional) que precarga lo ya elegido y guarda con Server Action. El registro ahora cae acá; el paso 3 de la spec llega con Comunidad (D-024). "Mi tejido" recuerda terminarlo mientras el perfil esté vacío.
- **Perfil público (`/@usuario`)**: avatar con iniciales, nombre, bio corta, ubicación/país, técnicas, nivel, enlaces (Instagram, TikTok, Facebook, Pinterest y sitio) y "se sumó en <mes año>". Privacidad público/privado (D-026); las cuentas sin perfil muestran una tarjeta honesta con invitación a completarlo. Enlaces para verlo desde "Mi tejido" y desde Configuración.
- **Edición del perfil en `/configuracion`**: bio, ubicación, país, técnicas, nivel, enlaces (normalizados por red: `@usuario`, usuario pelado o URL completa; los enlaces de contenido o páginas sin usuario se rechazan) y privacidad, con Server Actions + Zod revalidado en el servidor.
- Migración `0001` (`profile`, spec §6) aplicada a Neon; cascada al borrar la cuenta verificada.
- **Calidad**: typecheck + lint + **48 tests**; build verde con la ruta dinámica (`instant = false`, con y sin arroba, mayúsculas). El 404 real de perfiles inexistentes pasa por `proxy.ts` reescribiendo a `/no-encontrado` (ver D-028: el caparazón PPR no puede cambiar el estado). Prueba de humo local: registro → aviso en Mi tejido → bienvenida precargada → perfil público con datos → privado (visitante vs. dueño) → 404 real → cuenta de prueba borrada.

Hecho (enlaces sociales y tests e2e, mismo día):
- **Enlaces sociales ampliados** (pedido del dueño): además de Instagram y el sitio, el perfil acepta **TikTok, Facebook y Pinterest**. Cada red normaliza su entrada (`@usuario`, usuario pelado o URL completa, con `www.`, `m.`, `fb.com` o dominios de Pinterest) y rechaza enlaces de contenido (`instagram.com/p/…`, `tiktok.com/video/…`, `pinterest.com/pin/…`) y perfiles sin usuario (`profile.php`). La tarjeta pública muestra cada red con su ícono y Configuración los precarga.
- **Tests de punta a punta con Playwright** (`pnpm test:e2e`, local por ahora; ver D-029): **8 pruebas** sobre un servidor propio en el puerto 3100 y la base de `.env.local` — registro completo, verificación por email (abriendo el enlace real desde una bandeja de salida), bienvenida, perfil (bio, enlaces, modo privado visto por un visitante), ingreso por `@usuario`, cierre de sesión, recuperación de contraseña y comprobaciones públicas (404 real y pantallas privadas pidiendo ingreso). Los usuarios de prueba se borran al empezar y al terminar.
- **Calidad**: typecheck + lint + **51 tests** unitarios + **8 e2e** en verde; `pnpm build` verde.

Pendiente para cerrar la fase (diferidos a propósito; no bloquean el cierre):
- [x] **Dueño**: variables en Vercel cargadas (los 3 entornos): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`.
- [x] Push a `main`, CI en verde y deploy verificado en producción: registro, sesión, `/mi-tejido` con y sin cookie (307 al ingreso), `/configuracion` y páginas públicas. La cuenta de prueba se borró al terminar. Resend quedó en modo de prueba (solo entrega a la casilla del dueño).
- [x] Probar el flujo completo desde el navegador: registro con el email del dueño, llegar el mail, confirmar y verificarlo en el sitio. Confirmado por el dueño el 17/10.
- [x] Onboarding de bienvenida (`/bienvenida`, 2 de los 3 pasos; ver D-024) y perfil público (`/@usuario`) — ver arriba.
- [x] Enlaces sociales ampliados (TikTok, Facebook y Pinterest) y tests e2e de auth y perfil con Playwright (`pnpm test:e2e`; ver D-029) — ver arriba.
- [ ] **Dueño**: recorrer `/bienvenida` con su cuenta y mirar su perfil público (`/@suusuario`).
- [ ] Avatar con subida a Cloudflare R2 — la infraestructura de imágenes ya está andando (ver D-033), así que se implementa con la misma base; sin fotos, hoy se muestran iniciales.
- [ ] Sumar los e2e al CI cuando exista la rama de Neon de desarrollo (D-021) — hoy son locales.
- [ ] Google OAuth (pospuesto) y decisión de dominio.
- [ ] Opcional: pegar la `RESEND_API_KEY` también en `.env.local` para que los mails salgan desde la máquina local (sin ella, se registran en consola).

## Fase 3 — Mi tejido (parte 1) (2026-10-17 → )

Primer tramo: **proyectos** (spec §5.3), con la misma vara de calidad (typecheck + lint + unit + e2e + build verdes).

Hecho (proyectos):
- **Modelo**: tabla `project` (migración `0002`) con estados `Tejiendo / En pausa / Terminado / Frogueado`, progreso manual 0–100, técnica, patrón (texto o enlace), talla, para quién, fecha de inicio, etiquetas, notas, visibilidad por proyecto, borrado lógico y slug único por persona estable (D-030). IDs con `cuid2`.
- **Gestión en Mi tejido**: hub con resumen por estado y últimos proyectos; listado completo en `/mi-tejido/proyectos`; creación en `/mi-tejido/proyectos/nuevo` (solo el nombre es obligatorio — 30 segundos reales), detalle con cambio rápido de estado (sin recargar, con aviso al terminar) y edición; eliminar con confirmación en dos pasos. La hoja *Crear* del botón central ya lleva a "Proyecto".
- **Cara pública**: página `/@usuario/proyectos/slug` sin login (con 404 real vía `proxy.ts`, D-031), sección "Proyectos" en el perfil público (últimos 6, respeta privacidad) y privacidad por proyecto: los privados se ven solo desde la cuenta dueña y el resto ve una tarjeta que lo explica.
- **Calidad**: **61 tests** unitarios (slug, validaciones, conversiones del formulario) + **13 e2e** (5 nuevos: creación, estado, público/privado con visitante real y 404 de proyecto; `pnpm test:e2e`, 54 s) + build verde. Usuarios de prueba borrados al terminar.

Hecho (infraestructura de imágenes, mismo día):
- **Cloudflare R2 activado** (plan gratuito, 10 GB): bucket `ovillo`, token acotado *Object Read & Write*, credenciales en `.env.local` y módulo `storage/` con cliente lazy sobre `aws4fetch` + chequeo de humo real `pnpm storage:check` (sube, verifica y borra un objeto) en verde contra el bucket real (D-032). La **URL pública** del bucket (r2.dev) quedó activada y el chequeo confirma la lectura pública. Falta solo cargar las variables `R2_*` en Vercel (5) antes de desplegar el tramo de fotos.

Hecho (diario de avance y fotos, mismo día):
- **Diario de avance** (spec §5.3): entradas con fecha (hoy por defecto), texto corto (hasta 500 caracteres) y hasta 4 fotos, con vista previa antes de guardar, confirmación en dos pasos para borrar y lista ordenada de lo más reciente primero. Entra desde la hoja *Crear* ("Entrada de diario" ahora lleva a elegir proyecto) y desde el detalle de cada proyecto. "Publicar en el feed" se guarda para Fase 7 (la columna `share_to_feed` ya está reservada).
- **Fotos del proyecto**: galería de hasta 20 por proyecto, reordenable, con **portada** (la primera subida es portada hasta elegir otra; al borrar la portada, pasa a la siguiente) y visor a pantalla completa con las acciones grandes para el celular. La página pública muestra la portada como imagen principal, la galería y el diario, y **comparte la portada en Open Graph**.
- **Cuidado de los 10 GB** (pedido del dueño): las fotos se **comprimen en el navegador** antes de subir (JPEG ≤ 1600 px + miniatura ≤ 640 px, ~150–400 KB por foto: alcanza para más de 20.000 fotos) y el servidor aplica **topes duros** (JPEG, 1,5 MB / 400 KB, galería 20, entrada 4). La subida va por `POST /api/fotos` (Route Handler para binarios) con autenticación y validación de dueña (D-033).
- **Modelo**: migración `0003` (`image`, `project_photo`, `project_entry` + `project.cover_image_id`). Al borrar una foto o una entrada se borran también sus objetos de R2.
- **Calidad**: **76 tests** unitarios + **22 e2e** en verde — 9 nuevos que suben fotos de verdad al bucket (comprimen en el navegador, esperan que las imágenes carguen desde la URL pública de R2), cambian portada, reordenan, guardan una entrada con foto, la ven sin sesión con el Open Graph correcto y borran todo; la limpieza de usuarios de prueba ahora también borra sus objetos de R2. Build verde.

Hecho (datos de prueba, mismo día):
- **Cuentas y contenido demo** (D-034): `pnpm db:seed-demo` siembra 5 cuentas (`@mariaruiz`, `@candelateje`, `@lupitateje`, `@solaguirre` con perfil privado y `@tomiteje` recién llegada) con 11 proyectos de estados y técnicas variadas (uno privado y uno sin portada), 27 fotos generadas localmente, 14 entradas de diario, 4 contadores de vueltas ya empezados y 15 herramientas de inventario. Re-ejecutarlo re-siembra desde cero; `--clean` solo borra. Contraseña compartida: `ovillo-demo-2026`.

Hecho (contador de vueltas, mismo día):
- **Contador de vueltas** (spec §5.4): hasta 10 contadores por proyecto ("cuerpo", "manga izq.") con nombre y recordatorio opcional *cada N vueltas*. Conteo rápido desde el detalle del proyecto y **pantalla completa** en `/contador/[id]`: botón +1 gigante, −1, reinicio con confirmación en dos pasos, aviso al llegar al múltiplo ("aumentar cada 6") con vibración, pantalla siempre encendida (Wake Lock cuando el navegador lo permite) y flechas ↑/↓ con teclado en escritorio.
- **Sin conexión de verdad**: cada toque se guarda al instante en el teléfono y sincroniza solo al volver la conexión (versión por contador para resolver conflictos; el registro local no se borra al sincronizar, D-035). La página pública del proyecto no muestra los contadores (son privados).
- **Modelo**: migración `0004` (`row_counter`, con `version`, `repeat_every` y conteo 0–99999).
- **Fix de prod (D-036)**: al verificar en producción apareció un bug viejo del ingreso: el prefetch sin sesión cacheaba la redirección de `/mi-tejido` y, tras enviar el formulario, la navegación devolvía al formulario. Ahora ingresar, registrarse y salir navegan con recarga completa (`hardNavigate`), verificado con un build de producción local (donde el prefetching está activo).
- **Calidad**: **91 tests** unitarios (14 nuevos: topes, recordatorio, resolución de conflictos) + **30 e2e** en verde — 8 nuevos, incluido uno que corta la red de verdad (`setOffline`), cuenta sin conexión y verifica que sincronice al volver. Build verde.

Hecho (herramientas, mismo día):
- **Inventario de agujas y ganchos** (spec §5.7): `/mi-tejido/herramientas` con la grilla de lo que tenés ordenada de la más fina a la más gruesa, filtro por tipo en chips (rectas, circulares, doble punta, ganchos), alta y edición en línea (tipo, medida, material, largo del cable en circulares, cuántas y notas) y borrado con confirmación en dos pasos. El hub de Mi tejido suma la tarjeta con el resumen ("Tenés N herramientas guardadas").
- **Equivalencias de numeración** (D-037): al escribir la medida se ve al instante su equivalencia ("US 6 · UK 8", en ganchos "US G-6") y la página incluye la **tabla de equivalencias** completa (mm ↔ US ↔ UK; ganchos mm ↔ letra US), tomada de la tabla del Craft Yarn Council. Si una medida no está en la tabla, no se inventa nada. Medidas de 0,5 a 25 mm en pasos de 0,25; hasta 200 herramientas; privadas como el cuaderno.
- **Modelo**: migración `0005` (`tool`), sumada a la base. `project_tool` (asignar herramientas a proyectos) queda para la Fase 5, junto con el inventario de lana.
- **Datos demo**: las cuentas demo ahora también tienen herramientas (María 7, Candela 3, Lupita 3, Sol 2: 15 en total, con materiales, cables y cantidades variadas).
- **Calidad**: **108 tests** unitarios (17 nuevos: grilla de medidas, parseo con coma, topes, tablas ordenadas y sin repetidas) + **38 e2e** en verde — 8 nuevos (estado vacío y hub, alta con equivalencia, gancho y circular con cable, filtros, edición, borrado y privacidad). Build verde y repaso del flujo con un build de producción local.

Pendientes de la fase (anotados; no frenan el cierre):
- [ ] (Calidad) e2e contra un build de producción (prefetching real): hoy `pnpm test:e2e` corre en dev y no ve esta clase de bugs; sumar un proyecto de Playwright contra `pnpm build` + `pnpm start` (o el deploy de preview).
- [ ] (Diferido a propósito) Del tramo de fotos: campo de texto alternativo en la UI, `blurhash`, limpieza de imágenes huérfanas, editar entradas guardadas. Del contador: atajo en la hoja *Crear*, notificaciones del recordatorio, contadores compartidos entre proyectos. De herramientas: asignarlas a proyectos (`project_tool`, Fase 5) y avatar con subida (misma infraestructura de R2).

Notas:
- Por ahora dev y producción comparten la misma base Neon (D-021); antes del registro público hace falta una rama de desarrollo.
- La migración `0000` es la primera del repo; `db/auth-schema.ts` se regenera con el CLI (D-022), no se edita a mano.
- Las migraciones `0001` (`profile`), `0002` (`project`), `0003` (`image`, `project_photo`, `project_entry`), `0004` (`row_counter`) y `0005` (`tool`) ya están aplicadas; se generan y aplican solo con `pnpm db:generate` + `pnpm db:migrate`.
