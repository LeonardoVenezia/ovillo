/**
 * Constantes compartidas entre `playwright.config.ts` y los tests e2e.
 */

/** Puerto propio de los tests: no pisa un `pnpm dev` abierto en el 3000. */
export const E2E_PORT = 3100;

export const BASE_URL = `http://localhost:${E2E_PORT}`;

/** Bandeja de salida de emails (ver `lib/email.ts` y `e2e/helpers/outbox.ts`). */
export const OUTBOX_PATH = "test-results/outbox.jsonl";
