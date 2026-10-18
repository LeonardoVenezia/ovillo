import { deleteTestUsers } from "./helpers/db";

/**
 * Limpieza final: los usuarios de prueba no quedan en la base.
 *
 * Es mejor esfuerzo: si la red falla justo acá (los tests ya pasaron), la
 * próxima corrida limpia en su `globalSetup`; no tiene sentido tumbar una
 * suite verde por un timeout de red al ordenar.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    await deleteTestUsers();
  } catch (error) {
    console.warn(
      "No se pudo limpiar al final (la próxima corrida limpia antes de empezar):",
      error,
    );
  }
}
