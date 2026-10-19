import { cacheLife } from "next/cache";

/**
 * El año en curso, para "Mi año tejiendo" (spec §5.14).
 *
 * Cache Components no deja leer `new Date()` durante el prerenderizado, así
 * que el valor se cachea con vida de un día: a lo sumo, la madrugada del 1 de
 * enero todavía se ve el año viejo y se corrige solo.
 */
export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");

  return new Date().getFullYear();
}
