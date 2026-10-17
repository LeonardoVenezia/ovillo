import { deleteTestUsers } from "./helpers/db";

/** Limpieza final: los usuarios de prueba no quedan en la base. */
export default async function globalTeardown(): Promise<void> {
  await deleteTestUsers();
}
