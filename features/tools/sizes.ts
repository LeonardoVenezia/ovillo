import type { ToolKind } from "@/db/tool-schema";

/**
 * Tabla de equivalencias de numeración (spec §5.7: "medida en mm con
 * equivalencia US/UK"). Los valores salen de la tabla del Craft Yarn Council
 * (la que usan las marcas; ver docs/DECISIONS.md, D-037):
 *
 * - Agujas: milímetros ↔ número US ↔ número UK viejo (el UK dejó de usarse
 *   alrededor de 10 mm; de ahí en adelante solo hay US).
 * - Ganchos: milímetros ↔ letra US. Los ganchos de acero para hilo fino
 *   tienen su propia numeración y quedan fuera de esta tabla.
 *
 * Acá solo vive la equivalencia "de manual": si la medida no está en la
 * tabla, no se muestra nada (mejor nada que un número inventado).
 */

export type NeedleEquivalence = {
  mm: number;
  us: string | null;
  uk: string | null;
};

/** Agujas y palillos: la tabla clásica de mm / US / UK. */
export const KNITTING_NEEDLE_SIZES: readonly NeedleEquivalence[] = [
  { mm: 1.5, us: "000", uk: "17" },
  { mm: 1.75, us: "00", uk: "15" },
  { mm: 2, us: "0", uk: "14" },
  { mm: 2.25, us: "1", uk: "13" },
  { mm: 2.5, us: "1½", uk: null },
  { mm: 2.75, us: "2", uk: "12" },
  { mm: 3, us: "2½", uk: "11" },
  { mm: 3.25, us: "3", uk: "10" },
  { mm: 3.5, us: "4", uk: null },
  { mm: 3.75, us: "5", uk: "9" },
  { mm: 4, us: "6", uk: "8" },
  { mm: 4.5, us: "7", uk: "7" },
  { mm: 5, us: "8", uk: "6" },
  { mm: 5.5, us: "9", uk: "5" },
  { mm: 6, us: "10", uk: "4" },
  { mm: 6.5, us: "10½", uk: "3" },
  { mm: 7, us: null, uk: "2" },
  { mm: 7.5, us: null, uk: "1" },
  { mm: 8, us: "11", uk: "0" },
  { mm: 9, us: "13", uk: "00" },
  { mm: 10, us: "15", uk: "000" },
  { mm: 12.75, us: "17", uk: null },
  { mm: 15, us: "19", uk: null },
  { mm: 19, us: "35", uk: null },
  { mm: 25, us: "50", uk: null },
];

export type HookEquivalence = { mm: number; us: string };

/** Ganchos: milímetros ↔ letra US (estilo CYC, "G-6"). */
export const CROCHET_HOOK_SIZES: readonly HookEquivalence[] = [
  { mm: 2.25, us: "B-1" },
  { mm: 2.75, us: "C-2" },
  { mm: 3.25, us: "D-3" },
  { mm: 3.5, us: "E-4" },
  { mm: 3.75, us: "F-5" },
  { mm: 4, us: "G-6" },
  { mm: 4.5, us: "7" },
  { mm: 5, us: "H-8" },
  { mm: 5.5, us: "I-9" },
  { mm: 6, us: "J-10" },
  { mm: 6.5, us: "K-10½" },
  { mm: 8, us: "L-11" },
  { mm: 9, us: "M/N-13" },
  { mm: 10, us: "N/P-15" },
  { mm: 15, us: "P/Q" },
  { mm: 16, us: "Q" },
  { mm: 19, us: "S" },
  { mm: 25, us: "T/U/X" },
];

/** "4" / "3,5" / "2,25": milímetros con coma decimal, sin ceros de más. */
export function formatMm(mm: number): string {
  const rounded = Math.round(mm * 100) / 100;
  return String(rounded).replace(".", ",");
}

/** Equivalencia de una aguja, o `null` si esa medida no está en la tabla. */
export function needleEquivalence(mm: number): NeedleEquivalence | null {
  return KNITTING_NEEDLE_SIZES.find((size) => size.mm === mm) ?? null;
}

/** Equivalencia de un gancho, o `null` si esa medida no está en la tabla. */
export function hookEquivalence(mm: number): HookEquivalence | null {
  return CROCHET_HOOK_SIZES.find((size) => size.mm === mm) ?? null;
}

/**
 * Texto listo para mostrar junto a la medida: "US 6 · UK 8" en agujas,
 * "US G-6" en ganchos. `null` si no hay equivalencia (o el número no es una
 * medida válida).
 */
export function equivalenceLabel(kind: ToolKind, mm: number): string | null {
  if (kind === "gancho") {
    const hook = hookEquivalence(mm);
    return hook ? `US ${hook.us}` : null;
  }

  const needle = needleEquivalence(mm);
  if (!needle) {
    return null;
  }
  const parts = [
    needle.us ? `US ${needle.us}` : null,
    needle.uk ? `UK ${needle.uk}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}
