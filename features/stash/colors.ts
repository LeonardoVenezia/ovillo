import type { ColorFamily } from "@/db/stash-schema";

/**
 * Muestritas de color del inventario (spec §5.7: "vista en grilla por color").
 *
 * Son decorativas: cada muestrita viaja siempre con la etiqueta del color
 * escrita, así que nadie depende de distinguir un color por sí solo.
 */
export const colorFamilySwatch: Record<ColorFamily, string> = {
  rojo: "bg-red-600",
  rosa: "bg-pink-400",
  naranja: "bg-orange-500",
  amarillo: "bg-yellow-400",
  verde: "bg-green-600",
  azul: "bg-blue-600",
  violeta: "bg-violet-500",
  marron: "bg-amber-800",
  gris: "bg-gray-400",
  negro: "bg-neutral-900",
  blanco: "border-border bg-white",
  multicolor:
    "bg-[linear-gradient(135deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7)]",
  otro: "border-border border-dashed bg-transparent",
};
