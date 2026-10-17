/**
 * Estilo compartido de los chips de proyectos (estado, técnica): botones
 * redondos con `aria-pressed`, cómodos de tocar en el celular. Mismo
 * lenguaje visual que los selectores del perfil.
 */

export const chipStyles =
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export const chipSelected = "border-primary bg-primary/10 font-medium";
export const chipIdle = "border-border hover:bg-muted";
