# PROGRESS — Ovillo

Bitácora de construcción por fases (spec §10: cada fase cierra con tests verdes y una nota acá).
Última actualización: 2026-10-17

## Estado general

- [x] Fase 0 — Repo y documentación
- [x] Fase 1 — Base del proyecto (deploy en Vercel + base Neon conectada)
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

Pendiente para cerrar la fase:
- [ ] **Dueño**: crear la `RESEND_API_KEY` en Resend (API Keys → Create) y pasarla; cargar en Vercel (Settings → Environment Variables, los 3 entornos): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`.
- [ ] Push a `main` y verificación del deploy (recién cuando Vercel tenga las variables: el sitio las necesita en runtime).
- [ ] Probar registro y verificación de email reales desde el navegador.
- [ ] Onboarding de bienvenida (`/bienvenida`, 3 pasos) y perfil público (`/@usuario`).
- [ ] Avatar con subida a Cloudflare R2 (requiere tarjeta en Cloudflare → pedir OK al dueño) — sin R2, hoy se muestran iniciales.
- [ ] Tests e2e de auth (Playwright).
- [ ] Google OAuth (pospuesto) y decisión de dominio.

Notas:
- Por ahora dev y producción comparten la misma base Neon (D-021); antes del registro público hace falta una rama de desarrollo.
- La migración `0000` es la primera del repo; `db/auth-schema.ts` se regenera con el CLI (D-022), no se edita a mano.
