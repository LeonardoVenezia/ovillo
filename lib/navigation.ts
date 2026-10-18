"use client";

/**
 * Navegación completa (recarga de documento) a una ruta interna.
 *
 * Se usa **solo** después de un cambio de sesión (ingresar, registrarse,
 * salir). El cliente guarda en caché respuestas prefetcheadas de la sesión
 * anterior —por ejemplo, la redirección al ingreso que ve una visitante al
 * prefetchear `/mi-tejido`— y con `router.push` el router puede reusar esa
 * caché y volver a la pantalla equivocada. Una recarga garantiza que todo se
 * renderice con la sesión nueva y, al salir, que no quede nada de la sesión
 * anterior en el cliente (privacidad).
 *
 * La regla de ESLint `@next/next/no-location-assign-relative-destination`
 * desaconseja `location.assign` para rutas internas (para no perder las
 * ventajas del enrutado del cliente); este helper es la excepción deliberada,
 * documentada en D-036.
 */
export function hardNavigate(path: string): void {
  window.location.assign(path);
}
