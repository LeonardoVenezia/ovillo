# Comunidad de tejido — Especificación del proyecto (v1)

Oct 16, 2026 · @Leonardo

## 1. Visión del producto

Construimos una comunidad web en español para personas que tejen (dos agujas, crochet y otras técnicas textiles), inspirada en Ravelry pero más simple, moderna y pensada primero para el celular. Nombre de trabajo: **Ovillo** (provisional; usar una constante `SITE_NAME` para poder cambiarlo).

El producto resuelve tres necesidades en un solo lugar:

1. **Organizar mi tejido**: registrar proyectos con fotos y avance, guardar patrones que quiero hacer y llevar inventario de mi lana.
2. **Inspirarme**: ver qué tejen otras personas, explorar patrones y ver cómo quedaron hechos por la comunidad.
3. **Apoyarnos**: pedir ayuda cuando me trabo, festejar terminados, participar en grupos y tejidos en conjunto.

**Para quién.** Tejedoras y tejedores hispanohablantes (Latinoamérica y España), desde principiantes que aprenden con videos hasta personas experimentadas que diseñan. Muchas usan el celular mientras tejen, con las manos ocupadas.

**Principios de producto** (Claude Code debe usarlos para desempatar decisiones):

- **Simple antes que completo.** Cada pantalla tiene una acción principal clara. Lo avanzado se esconde detrás de "más opciones".
- **Mobile first.** Todo se diseña primero a 375 px y se usa con una mano.
- **Cargar datos tiene que ser rápido.** Crear un proyecto debe tomar menos de 30 segundos: foto + nombre alcanzan; el resto es opcional.
- **La comunidad es amable.** El diseño empuja a ayudar y celebrar, no a competir. Nada de contadores de seguidores protagonistas.
- **Español de verdad.** Terminología textil en español con sinónimos regionales (ver módulo de glosario), no traducciones literales del inglés.
- **Accesible y calmo.** Contraste correcto, sin animaciones agresivas, respeto por `prefers-reduced-motion`. Es la lección más cara de Ravelry (ver sección 2).

## 2. Qué aprendemos de Ravelry

Ravelry funciona porque une una herramienta personal (el "Cuaderno") con una base de datos colaborativa de patrones y lanas y una red social de grupos y foros. Fundado en 2007, llegó a casi 9 millones de cuentas y cerca de 1 millón de usuarios activos mensuales en 2020 ([Wikipedia](https://en.wikipedia.org/wiki/Ravelry)). Su debilidad es la experiencia: está en inglés, no tiene app oficial y abruma a quien llega.

### Lo que funciona y copiamos (mejorado)

| Feature de Ravelry | Por qué la gente lo valora | Cómo lo hacemos nosotros |
| --- | --- | --- |
| Proyectos | Registro de lo tejido con fotos, lana usada y notas; los demás ven cómo quedó cada patrón | Proyecto con flujo de 30 s, diario de avance con fotos y estado visual |
| Cola (Queue) | Lista de lo que quiero tejer, ordenable ([tour](https://www.ravelry.com/tour/knitters-crocheters)) | "Quiero tejer": tablero simple, arrastrar para ordenar, botón "empezar" que crea el proyecto |
| Favoritos | Guardar inspiración sin compromiso | "Guardados" con colecciones, estilo Pinterest |
| Stash (inventario de lana) | Saber qué lana tengo y dónde; al usarla en un proyecto se descuenta ([rosygreenwool](https://rosygreenwool.com/know/ravelry)) | Inventario con foto, cantidad y ubicación; descuento automático al asignar a un proyecto |
| Buscar patrones por mi lana | Encontrar qué tejer con lo que ya tengo ([blog Ravelry](https://blog.ravelry.com/ravelry-resolutions)) | Desde cada lana: "¿qué puedo tejer con esto?" filtra por grosor y metros |
| Base de patrones con filtros | Filtros por tipo, galga, dificultad, metraje, diseñador | Filtros principales visibles, el resto en un panel; chips de filtros activos |
| Proyectos de otros por patrón | Ver variantes reales antes de empezar | Galería "hechos por la comunidad" destacada en cada patrón |
| Agujas y ganchos | Saber qué herramientas tengo ([foro knittinghelp](https://forum.knittinghelp.com/t/whats-the-hype-with-rav-knitting-site/56141)) | Inventario simple de agujas/ganchos con tabla de equivalencias de numeración |
| Grupos y foros | Ayuda para dudas que uno no sabe ni nombrar; grupos por tema y región | Grupos con hilos tipo pregunta/respuesta, respuestas marcadas como útiles |
| Tejidos en conjunto (KAL/CAL) | Tejer el mismo patrón acompañado | Evento con fechas dentro de un grupo y galería de participantes |
| Desafío anual | Meta de proyectos terminados por año | "Mi año tejiendo": meta opcional y resumen anual |
| Actividad de amigos | Ver avances de quien sigo | Feed de seguidos, cronológico, sin algoritmo opaco |

### Lo que falla y corregimos

- **Abruma.** Usuarios describen perderse y sentir que hay demasiado ([foro knittinghelp](https://forum.knittinghelp.com/t/ravelry/68381)); encontrar grupos cuesta ([Crochetville](https://forum.crochetville.com/topic/92757-ravelry-woes)). Nosotros: navegación de 5 secciones, onboarding de 3 pasos y estados vacíos que enseñan qué hacer.
- **Cargar datos da pereza.** Varios usuarios admiten no mantener el cuaderno por falta de tiempo ([foro knittinghelp](https://forum.knittinghelp.com/t/whats-the-hype-with-rav-knitting-site/56141)). Nosotros: pocos campos obligatorios, carga desde la cámara, autocompletar lanas y patrones.
- **Sin app y mobile flojo.** No hay app oficial; el hueco lo llenan apps de terceros ([Ravelry apps](https://www.ravelry.com/about/apps)). Nosotros: PWA instalable, mobile first, contador de vueltas integrado.
- **Accesibilidad.** El rediseño de junio de 2020 generó quejas por migrañas, vértigo y riesgo de convulsiones, y la respuesta inicial fue percibida como despectiva ([Wikipedia](https://en.wikipedia.org/wiki/Ravelry)). Nosotros: WCAG 2.2 AA, paleta calma, modo oscuro, sin patrones de rayas de alto contraste ni movimiento automático.
- **Compartir afuera.** Usuarios piden mostrar proyectos a quien no tiene cuenta ([Crochetville](https://forum.crochetville.com/topic/92757-ravelry-woes)). Nosotros: proyectos públicos visibles sin login, con buena vista previa al compartir en WhatsApp o Instagram.
- **Idioma.** Todo en inglés, con terminología ajena. Nosotros: español nativo con glosario regional (punto jersey / punto media / punto liso).

## 3. Alcance de la v1

La v1 incluye todo el producto comunitario y organizativo, completo y pulido; deja afuera cualquier compra, venta o monetización.

| Entra en v1 | Queda fuera de v1 |
| --- | --- |
| Registro e inicio de sesión con email/contraseña y Google | Marketplace, venta de patrones, pagos, suscripciones |
| Perfil público y configuración | Publicidad o patrocinios |
| Proyectos con diario de avance y fotos | App nativa iOS/Android (sí PWA) |
| Contador de vueltas | Chat en tiempo real (sí mensajes privados simples) |
| Biblioteca de patrones (gratuitos o enlaces externos) | Hospedar PDFs de patrones pagos |
| Base de lanas y marcas, colaborativa | Importar datos desde Ravelry (evaluar en v2) |
| Inventario de lana y de agujas/ganchos | Visor de patrones paso a paso tipo Ribblr |
| "Quiero tejer" (cola) y Guardados | Traducción automática a otros idiomas |
| Grupos, hilos de discusión y preguntas | Recomendaciones con IA |
| Tejidos en conjunto (KAL/CAL) dentro de grupos | Insignias pagas o features premium |
| Seguir personas, feed, reacciones y comentarios |  |
| Notificaciones en app y por email |  |
| Búsqueda global |  |
| Mensajes privados 1 a 1 |  |
| Moderación: reportes, bloqueo, panel de admin |  |
| Glosario de términos regionales |  |
| Meta anual y resumen "Mi año tejiendo" |  |

**Definición de terminado para la v1:** una persona nueva puede registrarse con Google, crear su primer proyecto con foto desde el celular en menos de un minuto, encontrar un patrón, guardarlo, unirse a un grupo, hacer una pregunta y recibir una notificación cuando le responden. Todo sin errores en consola, con Lighthouse ≥ 90 en accesibilidad y rendimiento en mobile.

## 4. Stack técnico

Todo el stack corre en planes gratuitos: Next.js full-stack sobre Vercel, Postgres en Neon con Drizzle, y Better Auth (open source, sin costo por usuario) para la autenticación. Los límites gratuitos de cada servicio cambian; Claude Code debe verificarlos en la documentación oficial antes de configurar.

| Capa | Elección | Motivo |
| --- | --- | --- |
| Framework | Next.js (App Router, última versión estable), TypeScript estricto | Front y back en un solo proyecto, Server Components y Server Actions |
| Base de datos | Neon Postgres, driver `@neondatabase/serverless` | Elegido por el dueño; branching para entornos de preview |
| ORM y migraciones | Drizzle ORM + drizzle-kit | Tipado fuerte, SQL explícito, adaptador oficial de Better Auth ([nexty.dev](https://nexty.dev/blogs/nextjs-boilerplate-better-auth-drizzle)) |
| Autenticación | [Better Auth](https://stacknotice.com/blog/better-auth-nextjs-complete-guide-2026) con email/contraseña + Google OAuth, sesiones en la base | Gratis, librería propia (no SaaS), buen soporte de Next.js y Drizzle. Alternativa equivalente: Neon Auth, que hoy usa Better Auth por debajo ([Neon docs](https://neon.com/docs/auth/migrate/from-legacy-auth)) |
| Email transaccional | Resend (plan gratuito) + React Email | Verificación de cuenta, recuperar contraseña, resúmenes de notificaciones |
| Imágenes | Cloudflare R2 (subida directa con URL firmada) + `next/image` | Plan gratuito generoso y sin costo de salida de datos |
| UI | Tailwind CSS + shadcn/ui (Radix) + lucide-react | Componentes accesibles, personalizables, sin look genérico si se ajustan tokens |
| Formularios y validación | react-hook-form + Zod (esquemas compartidos cliente/servidor) | Una sola fuente de verdad para validar |
| Búsqueda | Postgres full-text search en español + extensiones `unaccent` y `pg_trgm` | Sin servicio extra; tolera tildes y errores de tipeo |
| Rate limiting | Tabla en Postgres o Upstash Redis (plan gratuito) | Proteger login, registro, posteos y subidas |
| Hosting | Vercel Hobby | Gratis; su plan Hobby es para uso no comercial, revisar al monetizar |
| PWA | Manifest + service worker mínimo (Serwist o equivalente) | Instalable en el celular |
| Testing | Vitest (unidad), Playwright (e2e de flujos críticos) |  |
| Calidad | ESLint, Prettier, `tsc --noEmit` en CI (GitHub Actions) |  |
| Errores | Sentry (plan gratuito), opcional |  |

**Variables de entorno esperadas:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_SITE_URL`. Incluir un `.env.example` y validar todas al arrancar con Zod.

**Reglas de autenticación:**

- Email + contraseña con verificación de email obligatoria antes de publicar contenido (sí puede navegar y armar su cuaderno).
- Google OAuth; si el email ya existe con contraseña, vincular cuentas en lugar de duplicar.
- Recuperar contraseña por email; contraseñas de mínimo 8 caracteres, hash por defecto de Better Auth.
- Al registrarse se pide elegir un nombre de usuario único (`@usuario`), usado en las URLs públicas.
- Rutas privadas protegidas en servidor (no solo en el cliente).

## 5. Módulos funcionales

La v1 tiene 14 módulos; cada uno lista qué debe hacer y cómo se verifica que funciona. Todo contenido creado por usuarios tiene visibilidad (`publico`, `seguidores`, `privado`) salvo que se indique otra cosa.

### 5.1 Cuenta y onboarding

- Registro con email/contraseña o Google; elección de `@usuario` con validación de disponibilidad en vivo.
- Onboarding de 3 pasos, salteable: (1) qué tejo (dos agujas, crochet, otros) y nivel; (2) país/región, que define el vocabulario preferido del glosario; (3) sugerencia de 3 grupos y 5 personas para seguir.
- Configuración: datos de perfil, email, contraseña, cuentas vinculadas, preferencias de notificación, privacidad por defecto, tema claro/oscuro/sistema, reducir movimiento, exportar mis datos (JSON) y eliminar mi cuenta.
- **Acepto si:** registro + verificación + login + logout + recuperar contraseña funcionan por ambos métodos y están cubiertos por tests e2e.

### 5.2 Perfil público

- URL `/@usuario`. Avatar, nombre, bio corta, ubicación opcional, técnicas, enlaces externos (Instagram, blog).
- Pestañas: Proyectos, Guardados públicos, Grupos, Actividad.
- Contadores discretos: proyectos terminados y años tejiendo. Seguidores visibles solo dentro del perfil, nunca como métrica destacada.
- Botón Seguir, Mensaje, menú con Bloquear y Reportar.

### 5.3 Proyectos (el corazón del producto)

- Crear proyecto: solo **nombre** y **foto** son obligatorios. Opcionales: técnica, patrón (de la biblioteca o texto libre/enlace), lanas (del inventario o de la base), agujas/ganchos, talla, para quién, fecha de inicio, etiquetas, notas en Markdown simple.
- Estados: `En pausa`, `Tejiendo`, `Terminado`, `Frogueado` (deshecho). Barra de progreso manual opcional (0–100%).
- **Diario de avance:** entradas con fecha, foto(s) y texto corto. Cada entrada puede publicarse en el feed.
- Galería de hasta 20 fotos, reordenables, con foto de portada.
- Usar lana del inventario descuenta ovillos/metros; frogear o editar devuelve la cantidad.
- Marcar como terminado dispara una celebración sutil (sin confeti si reducir movimiento está activo) y ofrece compartir.
- Comentarios y reacciones en proyectos públicos.
- Vista pública sin login con Open Graph correcto (foto, título, autora).
- **Acepto si:** desde el celular se crea un proyecto con foto de cámara en menos de 30 segundos y queda visible en el perfil.

### 5.4 Contador de vueltas

- Uno o más contadores por proyecto, con nombre ("cuerpo", "manga izq.").
- Botones grandes (+1 / −1), reinicio con confirmación, recordatorio cada N vueltas ("aumentar cada 6").
- Pantalla completa con pantalla siempre encendida (Wake Lock API cuando esté disponible).
- Funciona offline y sincroniza al volver la conexión.

### 5.5 Biblioteca de patrones

- Ficha de patrón: nombre, diseñador/a (puede ser usuario o texto), técnica, categoría (prenda/accesorio/hogar/amigurumi…), dificultad 1–5, grosor de lana, metraje estimado, agujas sugeridas, galga, tallas, idioma, fotos, enlace de origen o PDF gratuito subido por su autor/a.
- Cualquier usuario puede cargar un patrón gratuito propio o enlazar uno externo. Los patrones enlazados de terceros no se resubirán como archivo.
- Galería "Hechos por la comunidad" con todos los proyectos que usan ese patrón.
- Puntaje de dificultad y valoración de 1–5 estrellas solo por quien tiene un proyecto con ese patrón.
- Búsqueda con filtros principales visibles (técnica, categoría, dificultad, grosor) y avanzados en un panel (metraje, galga, idioma, gratuito/enlace). Filtros activos como chips. Orden: relevancia, populares, recientes.
- "Con mi lana": filtro que cruza grosor y metros con mi inventario.
- Acciones: Guardar, Quiero tejer, Empezar proyecto.

### 5.6 Base de lanas

- Ficha: marca, nombre, composición (fibras y %), grosor estandarizado (lace, fingering, sport, DK, worsted, aran, bulky, super bulky, con equivalencias en español), metros por ovillo, gramos, agujas recomendadas, fotos.
- Colaborativa: cualquier usuario verificado propone una lana; queda visible al instante pero marcada como "sin revisar" hasta que un moderador la aprueba. Detección de duplicados por marca + nombre.
- Galería de proyectos tejidos con esa lana.

### 5.7 Mi inventario (lana y herramientas)

- Lana: vincular a la base o carga libre; color, lote de tiñido, cantidad (ovillos y/o gramos, cálculo de metros), ubicación física ("caja azul"), notas, fotos. Visibilidad por defecto privada.
- Agujas y ganchos: tipo (rectas, circulares, doble punta, gancho), medida en mm con equivalencia US/UK, material, largo de cable.
- Vista en grilla por color y por grosor; filtros rápidos.
- **Acepto si:** asignar 2 ovillos a un proyecto descuenta 2 del inventario y frogear el proyecto los devuelve.

### 5.8 Quiero tejer y Guardados

- "Quiero tejer": lista ordenable por arrastre (y con botones en mobile), con lana planeada y fecha objetivo opcional. Botón "Empezar" crea el proyecto prellenado.
- "Guardados": favoritos de patrones, proyectos y lanas, organizables en colecciones con nombre y visibilidad.

### 5.9 Comunidad: grupos e hilos

- Grupos con nombre, descripción, imagen, reglas, categoría (técnica, región, principiantes, diseñadoras, charla). Abiertos o con aprobación.
- Roles: dueño/a, moderador/a, miembro.
- Hilos con tipo: **Pregunta** (puede marcarse una respuesta como solución), **Charla**, **Muestro mi tejido**, **Anuncio** (solo moderadores).
- Respuestas con texto, fotos, menciones `@usuario`, citas y reacción "útil". Hilos fijados y cerrados.
- Grupos oficiales semilla: "Ayuda para principiantes", "Dos agujas", "Crochet", "Amigurumis", "Charla general", "Sugerencias para Ovillo".
- **Pedir ayuda rápido:** desde cualquier proyecto, botón "Pedir ayuda" crea una Pregunta en un grupo elegido, adjuntando fotos y patrón del proyecto.

### 5.10 Tejidos en conjunto (KAL/CAL)

- Evento dentro de un grupo: patrón(es), fechas de inicio y fin, hilo propio, etapas opcionales por semana.
- Unirse vincula un proyecto propio; galería de participantes y contador de terminados.

### 5.11 Social: seguir, feed, reacciones

- Seguir sin aprobación (salvo perfil privado). Feed de inicio cronológico con: proyectos nuevos, entradas de diario, terminados y patrones publicados por quien sigo, más actividad de mis grupos.
- Reacciones con un set corto (me encanta, ¡qué lindo!, me inspira, útil). Comentarios con un nivel de respuesta.
- Pestaña "Descubrir" para quien sigue a poca gente: proyectos recientes destacados y populares de la semana.

### 5.12 Notificaciones y mensajes

- Notificaciones en app (campana con contador) por: nuevo seguidor, comentario, reacción agrupada, mención, respuesta a mi pregunta, solución marcada, invitación a grupo, novedades de KAL.
- Email: inmediato para respuestas a preguntas y menciones; resumen diario o semanal para el resto. Todo configurable y con baja en un clic.
- Mensajes privados 1 a 1 con texto e imágenes; solicitud de mensaje cuando no hay seguimiento mutuo; respeto de bloqueos.

### 5.13 Búsqueda global

- Barra en el header (atajo `/` en desktop) que busca en patrones, proyectos, lanas, grupos, hilos y personas, con resultados agrupados.
- Insensible a tildes y mayúsculas, tolerante a errores, y con sinónimos del glosario (buscar "punto media" encuentra "punto jersey").

### 5.14 Glosario y mi año tejiendo

- Glosario de términos con variantes por país, abreviaturas y equivalencia en inglés (útil para leer patrones en inglés). Editable por moderadores.
- "Mi año tejiendo": meta opcional de proyectos por año, progreso en el perfil y resumen anual compartible (proyectos, metros tejidos, lana más usada).

## 6. Modelo de datos

El esquema se define en Drizzle con IDs de texto (`cuid2` o `nanoid`), `created_at`/`updated_at` en todas las tablas y borrado lógico (`deleted_at`) en el contenido de usuarios. Las tablas de Better Auth (`user`, `session`, `account`, `verification`) se generan con su CLI y se extienden, no se duplican.

| Tabla | Campos clave | Relaciones y notas |
| --- | --- | --- |
| `user` (Better Auth) | email, name, image, emailVerified | Extender con `username` único, `role` (user/moderator/admin), `banned_at` |
| `profile` | user\_id, bio, location, country, crafts\[\], skill\_level, links (jsonb), default\_visibility, theme, reduce\_motion | 1 a 1 con user |
| `follow` | follower\_id, following\_id | PK compuesta; índice inverso |
| `block` | blocker\_id, blocked\_id | Filtra feed, mensajes, comentarios |
| `pattern` | slug, name, designer\_user\_id?, designer\_name, craft, category, difficulty, yarn\_weight, yardage\_min/max, needle\_sizes, gauge, sizes, language, source\_url, pdf\_url, is\_free, created\_by, search\_vector | Slug único; `tsvector` en español |
| `pattern_photo` | pattern\_id, image\_id, position |  |
| `pattern_rating` | pattern\_id, user\_id, stars, difficulty | Solo si existe un proyecto de ese usuario con el patrón |
| `yarn_brand` | name, slug, country |  |
| `yarn` | brand\_id, name, slug, weight, fiber (jsonb), meters, grams, needle\_mm, status (pending/approved), created\_by | Único (brand\_id, name) |
| `stash_item` | user\_id, yarn\_id?, custom\_name, colorway, dye\_lot, skeins, grams, meters\_total, location, notes, visibility | Cantidad disponible = total − asignada |
| `tool` | user\_id, kind, size\_mm, material, length\_cm | Agujas y ganchos |
| `project` | user\_id, slug, name, craft, status, progress, pattern\_id?, pattern\_text, size, made\_for, started\_at, finished\_at, tags\[\], notes, visibility, cover\_image\_id | Slug único por usuario |
| `project_yarn` | project\_id, stash\_item\_id?, yarn\_id?, skeins\_used, grams\_used | Al crear/editar/borrar ajusta el inventario en una transacción |
| `project_tool` | project\_id, tool\_id |  |
| `project_photo` | project\_id, image\_id, position |  |
| `project_entry` | project\_id, body, photos, created\_at, share\_to\_feed | Diario de avance |
| `row_counter` | project\_id, name, count, repeat\_every, updated\_at | Sync con versión para resolver conflictos offline |
| `queue_item` | user\_id, pattern\_id, position, planned\_stash\_item\_id?, target\_date, notes | Orden con índice fraccional |
| `collection` / `saved_item` | user\_id, name, visibility / collection\_id?, target\_type, target\_id | Polimórfico: pattern, project, yarn |
| `group` | slug, name, description, rules, category, image\_id, join\_policy, created\_by |  |
| `group_member` | group\_id, user\_id, role, status | status: active/pending/banned |
| `thread` | group\_id, author\_id, type, title, body, pinned, locked, solution\_post\_id, last\_activity\_at |  |
| `post` | thread\_id, author\_id, body, quoted\_post\_id?, edited\_at |  |
| `event` | group\_id, thread\_id, name, pattern\_ids\[\], starts\_at, ends\_at | KAL/CAL |
| `event_participant` | event\_id, user\_id, project\_id |  |
| `comment` | author\_id, target\_type, target\_id, parent\_id?, body | Proyectos, entradas de diario, patrones |
| `reaction` | user\_id, target\_type, target\_id, kind | Único (user, target, kind) |
| `activity` | actor\_id, verb, object\_type, object\_id, visibility, created\_at | Base del feed (fan-out en lectura) |
| `notification` | user\_id, type, actor\_id, object\_type, object\_id, read\_at, emailed\_at | Agrupar por (type, object) |
| `conversation` / `message` | participants / conversation\_id, sender\_id, body, image\_id, read\_at | Mensajes privados |
| `report` | reporter\_id, target\_type, target\_id, reason, details, status, resolved\_by | Moderación |
| `image` | owner\_id, r2\_key, width, height, blurhash, alt\_text | Todas las fotos pasan por acá |
| `glossary_term` | term, variants (jsonb por país), abbreviation, english, definition | Alimenta sinónimos de búsqueda |
| `yearly_goal` | user\_id, year, target\_projects |  |
| `notification_pref` | user\_id, type, in\_app, email\_mode | email\_mode: instant/daily/weekly/off |

**Índices mínimos:** FKs, `(user_id, created_at desc)` en project/activity/notification, GIN sobre `search_vector` y trigram sobre nombres, `(thread_id, created_at)` en post, `(target_type, target_id)` en comment/reaction/saved\_item.

**Seeds:** marcas y lanas populares de Argentina, México, España, Chile y Colombia (unas 50), grosores, glosario base (unos 100 términos), grupos oficiales y unos 20 patrones gratuitos de ejemplo con permiso o de autoría propia. En desarrollo, un seed de usuarios y proyectos falsos con imágenes de placeholder.

## 7. Navegación y rutas

La navegación principal tiene cinco destinos: **Inicio**, **Explorar**, **Crear (+)**, **Comunidad** y **Mi tejido**. En mobile es una barra inferior fija con el botón Crear al centro; en desktop, un header con los mismos destinos, búsqueda, notificaciones y avatar.

- **Inicio:** feed de seguidos y grupos; si es nuevo, "Descubrir".
- **Explorar:** patrones, proyectos y lanas con búsqueda y filtros.
- **Crear (+):** hoja inferior con Proyecto, Entrada de diario, Lana al inventario, Pregunta, Patrón.
- **Comunidad:** mis grupos, hilos recientes, preguntas sin responder, KAL activos.
- **Mi tejido:** proyectos, contadores, Quiero tejer, Guardados, inventario de lana y herramientas, meta anual.

| Ruta | Contenido | Acceso |
| --- | --- | --- |
| `/` | Landing pública (sin sesión) o feed (con sesión) | Mixto |
| `/ingresar`, `/registro`, `/recuperar`, `/verificar` | Autenticación | Público |
| `/bienvenida` | Onboarding | Privado |
| `/explorar`, `/explorar/patrones`, `/explorar/proyectos`, `/explorar/lanas` | Exploración | Público |
| `/patrones/[slug]` | Ficha de patrón | Público |
| `/lanas/[marca]/[slug]` | Ficha de lana | Público |
| `/@[usuario]` | Perfil | Público según privacidad |
| `/@[usuario]/proyectos/[slug]` | Proyecto | Según visibilidad |
| `/mi-tejido` y subrutas `proyectos`, `quiero-tejer`, `guardados`, `lanas`, `herramientas`, `meta` | Cuaderno personal | Privado |
| `/contador/[id]` | Contador a pantalla completa | Privado |
| `/comunidad`, `/grupos`, `/grupos/[slug]`, `/grupos/[slug]/hilos/[id]` | Grupos e hilos | Lectura pública, escribir con sesión |
| `/grupos/[slug]/eventos/[id]` | KAL/CAL | Lectura pública |
| `/mensajes`, `/mensajes/[id]` | Mensajes privados | Privado |
| `/notificaciones` | Notificaciones | Privado |
| `/buscar?q=` | Resultados globales | Público |
| `/glosario` | Glosario | Público |
| `/configuracion/*` | Cuenta, perfil, privacidad, notificaciones, apariencia | Privado |
| `/admin/*` | Reportes, usuarios, lanas pendientes, glosario | Solo moderador/admin |
| `/normas`, `/privacidad`, `/terminos` | Legales y normas de convivencia | Público |

Las páginas públicas se renderizan en servidor con metadatos SEO, Open Graph, `sitemap.xml` y `robots.txt`. Las URLs usan palabras en español y slugs legibles.

## 8. Diseño visual

La dirección es "taller cálido y editorial": fondos tipo papel crudo, fotos de tejido como protagonistas, tipografía con carácter y mucho aire. El objetivo es que no se vea como una plantilla genérica de shadcn ni como un SaaS violeta con degradés.

**Tokens base** (definir como variables CSS en `:root` y en modo oscuro; ajustar luego):

| Token | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--bg` | #FAF7F2 (crudo) | #1C1A17 | Fondo general |
| `--surface` | #FFFFFF | #26231F | Tarjetas, hojas |
| `--text` | #2A2622 | #EDE8E1 | Texto principal |
| `--muted` | #6E665D | #A39A8F | Texto secundario |
| `--primary` | #B5532E (terracota) | #E07A52 | Acción principal |
| `--accent` | #4F6B53 (verde salvia) | #8FB094 | Etiquetas, estados "terminado" |
| `--border` | #E6DFD5 | #3A3530 | Bordes suaves |

Verificar contraste AA de cada combinación texto/fondo antes de usarla.

**Tipografía:** títulos en una serif con personalidad (Fraunces o Newsreader), texto en una sans legible (Inter o Geist), vía `next/font`. Tamaño base 16 px, interlineado 1,5.

**Reglas para que no parezca vibecodeado:**

- Grilla de fotos tipo masonry o 4:5 consistente; las fotos de usuarios mandan, la UI se retira.
- Radios coherentes (8 px en controles, 16 px en tarjetas), sombras casi nulas, bordes finos.
- Nada de emojis como íconos, degradés de colores ni glassmorphism. Íconos de una sola familia (lucide) a 1,5 px.
- Estados vacíos con una ilustración de línea simple y una acción clara ("Todavía no cargaste lana. Sacá una foto a tu primer ovillo").
- Microcopy cálido y en español neutro, sin tecnicismos. Skeletons en lugar de spinners.
- Microinteracciones de 150–200 ms, desactivadas con `prefers-reduced-motion`.
- Placeholder de imagen con blurhash mientras carga.
- Componentes clave a diseñar con cuidado: tarjeta de proyecto, ficha de patrón, hilo de pregunta con solución, contador de vueltas, hoja "Crear".

Crear una página interna `/dev/ui` (solo en desarrollo) que muestre todos los componentes y tokens, para iterar el diseño después sin tocar cada pantalla.

## 9. Moderación, seguridad, privacidad y accesibilidad

Una comunidad amable necesita herramientas de moderación desde el día uno; no se agregan después.

**Moderación**

- Normas de convivencia visibles en `/normas` y aceptadas al registrarse.
- Reportar cualquier contenido o persona con motivo (spam, acoso, contenido inapropiado, plagio de patrón, otro).
- Panel `/admin`: cola de reportes con contexto, acciones (ocultar, borrar, advertir, suspender temporal, banear), historial de acciones por usuario, aprobación de lanas y edición del glosario.
- Moderadores de grupo pueden fijar, cerrar, borrar y expulsar dentro de su grupo.
- Bloquear oculta mutuamente el contenido y corta mensajes, menciones y comentarios.
- Cuentas nuevas (menos de 24 h o sin email verificado) con límites más bajos de posteo y sin enlaces externos.

**Seguridad**

- Validación con Zod en cada Server Action y Route Handler; autorización verificada en servidor por recurso (no confiar en IDs del cliente).
- Rate limiting en login, registro, recuperar contraseña, posteos, comentarios, mensajes y subidas.
- Subida de imágenes con URL firmada, tipos permitidos (JPEG, PNG, WebP, HEIC convertido), máximo 10 MB, eliminación de metadatos EXIF (incluida la ubicación GPS) y redimensionado.
- Markdown sanitizado; sin HTML crudo de usuarios.
- Headers de seguridad (CSP, HSTS, X-Frame-Options) y cookies `httpOnly`, `secure`, `sameSite=lax`.
- Protección anti-bots en registro (Cloudflare Turnstile, gratuito).

**Privacidad**

- Visibilidad por contenido y por defecto en configuración; inventario privado por defecto.
- Ubicación del perfil solo a nivel ciudad/país y opcional.
- Exportar datos y borrar cuenta (con período de gracia de 30 días) desde configuración.
- Política de privacidad y términos en español simple.

**Accesibilidad (objetivo WCAG 2.2 AA)**

- Navegación completa por teclado, foco visible, landmarks y headings correctos.
- Campo de texto alternativo al subir fotos, sugerido pero no bloqueante.
- Contraste mínimo 4,5:1 en texto; objetivos táctiles de 44 px mínimo.
- Sin parpadeos, sin autoplay, sin patrones repetitivos de alto contraste en fondos.
- Opciones en configuración: tema, reducir movimiento, tamaño de texto (normal/grande).
- Test automático con axe en Playwright para las páginas principales.

## 10. Plan de implementación para Claude Code

Claude Code debe construir en 8 fases, en orden, dejando cada fase deployable y con tests verdes antes de pasar a la siguiente.

1. **Base del proyecto.** Next.js + TypeScript estricto, Tailwind, shadcn/ui, tokens de diseño, fuentes, layout con navegación mobile/desktop, tema claro/oscuro, `/dev/ui`, ESLint/Prettier, CI en GitHub Actions, conexión a Neon con Drizzle, validación de env.
2. **Autenticación y perfil.** Better Auth (email/contraseña + Google), verificación y recuperación por email con Resend, `@usuario`, onboarding, configuración, perfil público, subida de imágenes a R2. Tests e2e de los flujos de auth.
3. **Mi tejido (parte 1).** Proyectos completos con fotos y diario, contador de vueltas offline, herramientas.
4. **Catálogo.** Lanas y marcas con seeds, patrones, búsqueda en español con filtros, galerías "hechos por la comunidad".
5. **Mi tejido (parte 2).** Inventario de lana con descuento automático, Quiero tejer, Guardados y colecciones, "con mi lana", meta anual.
6. **Comunidad.** Grupos, roles, hilos con tipos y solución, "Pedir ayuda" desde proyecto, KAL/CAL, glosario.
7. **Social y notificaciones.** Seguir, feed, Descubrir, comentarios, reacciones, menciones, notificaciones en app y por email, mensajes privados, búsqueda global.
8. **Moderación y pulido.** Reportes, bloqueo, panel admin, rate limiting, Turnstile, legales, SEO/Open Graph, PWA, auditoría de accesibilidad y rendimiento, landing pública.

**Instrucciones de trabajo para Claude Code**

- Leer este documento completo antes de empezar y guardarlo en el repo como `docs/SPEC.md`; crear un `CLAUDE.md` con las convenciones de abajo.
- Estructura sugerida: `app/` (rutas), `components/` (UI), `features/<módulo>/` (acciones, queries, componentes y esquemas de cada módulo), `db/` (esquema y migraciones), `lib/` (auth, r2, email, utils).
- Preferir Server Components; usar Server Actions para mutaciones y Route Handlers solo para webhooks y subidas.
- Código y nombres en inglés; textos de la UI en español, centralizados en un archivo de mensajes para facilitar iterar el tono.
- Migraciones siempre con `drizzle-kit generate` + `migrate`, nunca `push` en producción. Usar una rama de Neon para desarrollo.
- Cada fase termina con: typecheck, lint, tests de unidad y e2e verdes, y una nota en `docs/PROGRESS.md` con lo hecho, decisiones tomadas y pendientes.
- Ante una ambigüedad, decidir según los principios de la sección 1, registrar la decisión en `docs/DECISIONS.md` y seguir; no frenar a preguntar salvo que implique gastar dinero o borrar datos.
- No agregar servicios pagos ni dependencias pesadas sin justificarlo en `DECISIONS.md`.

**Lo que el dueño debe preparar antes de la fase 2:** proyecto en Neon con `DATABASE_URL`, credenciales OAuth de Google (Google Cloud Console, con la URL de callback de Better Auth), cuenta de Resend con dominio verificado, bucket de Cloudflare R2 con claves de acceso y un dominio propio.

## 11. Después de la v1

La v1 no monetiza, pero el modelo de datos ya deja lugar para hacerlo sin migraciones dolorosas cuando haya masa crítica.

**Opciones de monetización a evaluar** (en orden de menor a mayor fricción con la comunidad):

- Donaciones o "socias fundadoras" con insignia en el perfil.
- Plan Pro opcional con extras de comodidad (más fotos, estadísticas, temas), nunca restringiendo lo comunitario.
- Venta de patrones de diseñadoras con comisión baja (los campos `designer_user_id` e `is_free` ya lo preparan).
- Directorio de tiendas de lana y teñidoras locales con perfil destacado.

**Ideas para v2:** importar proyectos e inventario desde Ravelry, visor de patrones con marcador de línea, notificaciones push de la PWA, eventos presenciales por ciudad, intercambio de lana entre usuarios, calculadora de metraje y de aumentos/disminuciones.

**Métricas para saber si hay masa crítica:** usuarios activos semanales, proyectos creados por semana, porcentaje de preguntas respondidas en menos de 24 h y retención a 30 días. Registrarlas desde la v1 con analítica respetuosa de la privacidad (por ejemplo, Umami o Plausible autohospedado).

## Fuentes

- [Ravelry — Wikipedia](https://en.wikipedia.org/wiki/Ravelry)
- [Ravelry — Tour para tejedoras](https://www.ravelry.com/tour/knitters-crocheters)
- [Ravelry blog — Ravelry Resolutions (stash y desafío anual)](https://blog.ravelry.com/ravelry-resolutions)
- [Ravelry — Apps de terceros](https://www.ravelry.com/about/apps)
- [Rosy Green Wool — Ravelry](https://rosygreenwool.com/know/ravelry)
- [Knitting Help forum — What’s the hype with Rav](https://forum.knittinghelp.com/t/whats-the-hype-with-rav-knitting-site/56141)
- [Knitting Help forum — Ravelry](https://forum.knittinghelp.com/t/ravelry/68381)
- [Crochetville — Ravelry woes](https://forum.crochetville.com/topic/92757-ravelry-woes)
- [Neon — Neon Auth con Better Auth](https://neon.com/docs/auth/migrate/from-legacy-auth)
- [Stacknotice — Better Auth en Next.js 2026](https://stacknotice.com/blog/better-auth-nextjs-complete-guide-2026)
- [Nexty.dev — Better Auth y Drizzle](https://nexty.dev/blogs/nextjs-boilerplate-better-auth-drizzle)
