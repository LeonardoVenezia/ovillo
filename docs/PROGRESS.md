# PROGRESS — Ovillo

Bitácora de construcción por fases (spec §10: cada fase cierra con tests verdes y una nota acá).
Última actualización: 2026-10-17

## Estado general

- [x] Fase 0 — Repo y documentación
- [x] Fase 1 — Base del proyecto (deploy en Vercel + base Neon conectada)
- [x] Fase 2 — Cuenta, auth y perfil (cerrada con pendientes diferidos a propósito)
- [ ] Fase 3 — Mi tejido (parte 1) ← en curso (proyectos hechos)
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
- [ ] Avatar con subida a Cloudflare R2 — R2 ya está activado y probado (ver Fase 3), así que se implementa junto con las fotos de proyectos; sin fotos, hoy se muestran iniciales.
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
- **Cloudflare R2 activado** (plan gratuito, 10 GB): bucket `ovillo`, token acotado *Object Read & Write*, credenciales en `.env.local` y módulo `storage/` con cliente lazy sobre `aws4fetch` + chequeo de humo real `pnpm storage:check` (sube, verifica y borra un objeto) en verde contra el bucket real (D-032). Pendiente del dueño: activar la **URL pública** del bucket (r2.dev) y pasarla; después, cargar las variables `R2_*` en Vercel antes de desplegar la primera subida de fotos.

Pendiente de esta fase (próximos tramos):
- [ ] Diario de avance (entradas con fecha, foto(s) y texto corto; "publicar en el feed" se guarda para Fase 7).
- [ ] Fotos: galería de hasta 20 por proyecto, reordenable y con portada — R2 ya activado y probado (`pnpm storage:check`, D-032); falta la URL pública del bucket y las variables `R2_*` en Vercel antes de desplegar el tramo.
- [ ] Contador de vueltas: varios por proyecto, botones grandes, recordatorio cada N vueltas, pantalla completa, modo offline con sincronización (spec §5.4).
- [ ] Herramientas: inventario de agujas y ganchos (medidas con equivalencias).

Notas:
- Por ahora dev y producción comparten la misma base Neon (D-021); antes del registro público hace falta una rama de desarrollo.
- La migración `0000` es la primera del repo; `db/auth-schema.ts` se regenera con el CLI (D-022), no se edita a mano.
- Las migraciones `0001` (`profile`) y `0002` (`project`) ya están aplicadas; se generan y aplican solo con `pnpm db:generate` + `pnpm db:migrate`.
