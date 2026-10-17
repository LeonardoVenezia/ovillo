import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { deleteTestUsers } from "./helpers/db";
import { OUTBOX_PATH } from "./helpers/urls";

/**
 * Preparación de la corrida e2e: bandeja de salida vacía y sin usuarios de
 * prueba de corridas anteriores. Los tests corren contra la misma base que
 * `.env.local` (Neon), así que la limpieza es parte del contrato.
 */
export default async function globalSetup(): Promise<void> {
  await mkdir(path.dirname(OUTBOX_PATH), { recursive: true });
  await writeFile(OUTBOX_PATH, "");
  await deleteTestUsers();
}
