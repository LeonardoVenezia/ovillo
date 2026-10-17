import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Verifica que los pares texto/fondo definidos en app/globals.css cumplan
 * WCAG 2.2 AA (4.5:1 para texto normal). El test lee el CSS real, así que
 * cualquier ajuste de paleta pasa por acá.
 */

function parseCssVars(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = css.match(new RegExp(escaped + "\\s*\\{([^}]*)\\}"));
  if (!block) {
    throw new Error(`No se encontró el bloque ${selector} en globals.css`);
  }
  const vars: Record<string, string> = {};
  for (const declaration of block[1].split(";")) {
    const match = declaration.match(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/);
    if (match) {
      vars[match[1]] = match[2].toLowerCase();
    }
  }
  return vars;
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const css = fs.readFileSync(
  path.join(import.meta.dirname, "../../app/globals.css"),
  "utf8",
);
const light = parseCssVars(css, ":root");
const dark = parseCssVars(css, ".dark");

const AA_NORMAL_TEXT = 4.5;

const pairs = [
  { fg: "foreground", bg: "background", label: "texto principal/fondo" },
  { fg: "foreground", bg: "card", label: "texto principal/tarjeta" },
  { fg: "muted-foreground", bg: "background", label: "texto secundario/fondo" },
  { fg: "muted-foreground", bg: "card", label: "texto secundario/tarjeta" },
  { fg: "primary", bg: "background", label: "primary como texto/fondo" },
  { fg: "primary-foreground", bg: "primary", label: "texto/acción principal" },
  { fg: "sage", bg: "background", label: "salvia/fondo" },
  { fg: "sage", bg: "card", label: "salvia/tarjeta" },
  { fg: "destructive", bg: "background", label: "error/fondo" },
  { fg: "destructive", bg: "card", label: "error/tarjeta" },
  { fg: "accent-foreground", bg: "accent", label: "texto/acento suave" },
  { fg: "secondary-foreground", bg: "secondary", label: "texto/secundario" },
];

describe.each([
  { theme: "claro", vars: light },
  { theme: "oscuro", vars: dark },
])("contraste WCAG AA — tema $theme", ({ vars }) => {
  it.each(pairs)("$label cumple 4.5:1", ({ fg, bg, label }) => {
    const fgHex = vars[fg];
    const bgHex = vars[bg];
    expect(fgHex, `falta --${fg} en globals.css`).toBeDefined();
    expect(bgHex, `falta --${bg} en globals.css`).toBeDefined();
    const ratio = contrastRatio(fgHex, bgHex);
    expect(
      ratio,
      `${label}: ${fgHex} sobre ${bgHex} → ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
