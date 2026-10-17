import { defineConfig, devices } from "@playwright/test";

import { BASE_URL, E2E_PORT, OUTBOX_PATH } from "./e2e/helpers/urls";

/**
 * Tests de punta a punta (spec §5.1: los flujos de cuenta quedan cubiertos).
 *
 * Corren contra un servidor de desarrollo propio en el puerto 3100, con la
 * misma base que lee `.env.local` (Neon) y usuarios de prueba que se borran al
 * empezar y al terminar (ver `e2e/helpers/db.ts`). Los emails no se envían:
 * van a una bandeja de salida que los tests leen (ver `lib/email.ts`).
 *
 * CI queda para cuando exista la rama de Neon de desarrollo (D-021): por
 * ahora `pnpm test:e2e` es local.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm dev --port ${E2E_PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      // Los emails van a la bandeja de salida y los enlaces apuntan al 3100.
      EMAIL_OUTBOX_PATH: OUTBOX_PATH,
      BETTER_AUTH_URL: BASE_URL,
    },
  },
});
