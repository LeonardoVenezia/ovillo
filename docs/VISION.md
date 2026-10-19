# VISION — Ovillo (qué construimos, para quién y cómo se usa)

> El "por qué" del proyecto, en idioma humano: la idea, el valor para cada persona y los flujos completos que queremos poder recorrer al final de la v1.
> **Fuente de verdad del producto: `SPEC.md`.** El estado vivo y lo que sigue, en `ESTADO.md`; la historia por fases, en `PROGRESS.md`; y las decisiones finas, en `DECISIONS.md`.

## La idea en una frase

Ovillo es una **comunidad web en español para personas que tejen** (dos agujas, crochet y otras técnicas textiles): inspirada en Ravelry, pero **más simple, moderna y pensada primero para el celular**.

## El problema que resuelve

El tejido es un hobby muy social, pero hoy la vida de una tejedora está repartida: los proyectos en una libreta o en la galería del teléfono, los patrones en PDFs sueltos, la lana en una caja con una lista mental, y la comunidad en grupos de WhatsApp e Instagram donde todo se pierde. Las herramientas que existen (sobre todo Ravelry) son poderosas pero están **en inglés, abruman al llegar y no están hechas para el teléfono**.

Ovillo junta esas tres necesidades en un solo lugar y en español:

1. **Organizar mi tejido**: proyectos con fotos y avance, patrones que quiero hacer, inventario de mi lana y herramientas.
2. **Inspirarme**: ver qué tejen otras, explorar patrones gratuitos reales y ver cómo quedaron hechos por la comunidad.
3. **Apoyarnos**: pedir ayuda cuando me trabo, festejar terminados, participar en grupos y tejidos en conjunto.

## Para quién es

Tejedoras y tejedores hispanohablantes (Latinoamérica y España), desde quien está aprendiendo con videos hasta quien diseña. Muchas usan el celular mientras tejen, con las manos ocupadas: por eso todo se diseña primero a 375 px y se usa con una mano.

## Los principios que desempatan cualquier duda

- **Simple antes que completo**: cada pantalla tiene una acción principal clara.
- **Mobile first**: si no funciona en el teléfono, no funciona.
- **Registrar es rápido**: crear un proyecto lleva menos de 30 segundos (foto + nombre alcanzan).
- **La comunidad es amable**: el diseño empuja a ayudar y celebrar, no a competir.
- **Español de verdad**: terminología textil con sinónimos regionales (glosario), nunca traducciones literales.
- **Accesible y calmo**: contraste correcto, animaciones suaves (respetando `prefers-reduced-motion`), WCAG 2.2 AA.
- **Gratis y honesta**: sin funciones oscuras de retención; los vacíos se muestran honestos y los números no se inventan nunca.

## El valor, por persona

- **Quien teje para sí**: su "cuaderno" ordenado —proyectos, diario, fotos, contador de vueltas, lanas y agujas, cola de "quiero tejer", guardados y meta anual— que además calcula solo cuánta lana le queda disponible.
- **Quien busca inspiración o su próximo proyecto**: una biblioteca de patrones gratuitos reales (con enlace a la fuente), el catálogo de lanas y las galerías "hechos por la comunidad" con fotos reales.
- **Quien necesita una mano**: "Pedir ayuda" desde el proyecto atascado, hilos con solución marcada y un glosario que traduce abreviaturas y regionalismos de los patrones.
- **La comunidad**: grupos oficiales y propios, hilos con cuatro tipos, y **tejidos en conjunto (KAL/CAL)** con etapas, participantes y su hilo de seguimiento.
- **Quien modera y quien enseña**: roles claros (dueña/o, moderadores), anuncios, fijar/cerrar hilos, aprobar ingresos, y un equipo (cuenta "Equipo Ovillo") que mantiene los grupos oficiales.
- **Quien propone**: la comunidad puede sumar lanas y patrones reales, que quedan visibles con el cartel de "sin revisar" hasta que la moderación los mira.

## Los flujos completos esperados al final del proyecto (v1)

Así se espera que se recorra Ovillo cuando esté terminado. Lo marcado como **(ya funciona)** está en producción hoy; **(Fase 7)** y **(Fase 8)** son los tramos que faltan.

### 1. Llegar sin cuenta y entender qué es esto *(ya funciona)*

Alguien llega desde un enlace de Instagram al celular → recorre el **catálogo de lanas**, la **biblioteca de patrones**, los **proyectos públicos**, el **glosario** y la **comunidad** sin registrarse → cuando quiere guardar algo o pedir ayuda, crea su cuenta (email y contraseña, o Google) → elige su `@usuario` y una bienvenida corta la orienta. Con la Fase 8 suma una **landing pública** que explica el producto y mejora el SEO/Open Graph.

### 2. Empezar y terminar un proyecto (el corazón del producto) *(ya funciona)*

Busca o encuentra un patrón → "Quiero tejer" (lo deja en su cola, con lana planeada y fecha si quiere) → "Empezar proyecto": foto + nombre y listo → va anotando su **diario** con fotos, el **contador de vueltas** (funciona sin conexión) y las **lanas y agujas** que usa (el inventario descuenta solo) → al terminarlo marca "Terminado", asocia la lana usada y el proyecto queda en las galerías "hechos por la comunidad" del patrón y de la lana.

### 3. Ordenar el taller *(ya funciona)*

Inventario de **lanas** (ovillos, gramos, color, ubicación, foto; disponible calculada) y **herramientas** → "Mi año tejiendo" con la meta anual, el resumen del año y los metros estimados → **guardados con colecciones** (públicas o privadas) para las ideas futuras.

### 4. Pedir ayuda y destrabarse *(ya funciona)*

Se traba con el cuello del sweater → desde el proyecto toca **"Pedir ayuda"** → se abre una pregunta en su grupo con el proyecto adjunto → alguien responde, prueba, y marca la respuesta como **solución** → quien busca en `/comunidad` ve las "Preguntas sin responder" (vidriera de ayuda).

### 5. Tejer en conjunto *(ya funciona)*

Entra a un grupo (abierto o con aprobación) → se suma a un **KAL/CAL** con su proyecto propio → sigue las **etapas**, ve cuántas terminaron, comparte avances en el **hilo del evento** y recibe el acompañamiento del grupo. La moderación arma el evento con fechas, patrones de la biblioteca y etapas.

### 6. Entender el idioma del tejido *(ya funciona)*

Encuentra un patrón lleno de abreviaturas o con palabras de otro país → busca en el **glosario** por término, abreviatura ("2 pj"), inglés ("k2tog") o variante regional ("liso" → punto jersey) → filtra por técnica (dos agujas / crochet) y sigue tejiendo. El glosario también alimenta la búsqueda global con sinónimos.

### 7. Mostrar y seguir a otras personas *(Fase 7 — social y notificaciones)*

Publica lo que terminó → **sigue** a las tejedoras que le inspiran → mira un **feed** y un **Descubrir** con lo nuevo de la comunidad → **comenta y reacciona** con cariño (sin contadores de seguidores protagonistas) → recibe **notificaciones en la app y por email** (respuestas, soluciones, menciones, avisos de sus KAL/CAL) → **mensajes privados** para tejer de cerca → y una **búsqueda global** que cruza patrones, lanas, proyectos, personas y los sinónimos del glosario.

### 8. Cuidar la casa *(Fase 8 — moderación, pulido y lanzamiento)*

La moderación usa el **panel admin** (editar grupos, hilos, eventos y el glosario; resolver **reportes**; **bloquear** cuentas; rate limiting y Turnstile contra el spam) → el producto se pule para abrir al público: legales, **PWA**, auditoría de accesibilidad y rendimiento, y la **landing**. El registro se abre a todo el mundo (rama de Neon de desarrollo, **dominio propio** y emails reales con Resend —los tres pendientes que dependen del dueño; ver `ESTADO.md`).

## Qué queda fuera de la v1 (a propósito)

- **Monetización**: la v1 es gratis; el modelo de datos ya deja lugar para donaciones, plan Pro opcional o venta de patrones de diseñadoras (spec §11).
- **App nativa**: se resuelve con la web mobile first y, más adelante, la PWA.
- **Respuestas anidadas, edición/borrado de publicaciones, "útil" y avisos al autor**: diferidos a fases futuras, ya anotados en `PROGRESS.md` y `DECISIONS.md`.
- **Importar desde Ravelry** y un visor de patrones con marcador de línea: ideas de v2 (spec §11).

## Cómo se mide que la idea funcionó

Usuarios activos semanales, proyectos creados por semana, porcentaje de preguntas respondidas en menos de 24 horas y retención a 30 días — registrados desde la v1 con analítica respetuosa de la privacidad (spec §11).
