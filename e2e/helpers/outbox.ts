import { readFile } from "node:fs/promises";

import type { OutboxMessage } from "../../lib/email";
import { OUTBOX_PATH } from "./urls";

/**
 * Bandeja de salida de emails (ver `lib/email.ts`): durante los tests el
 * servidor escribe cada email en un archivo JSONL en lugar de enviarlo, y
 * desde acá esperamos el enlace que necesitamos.
 */

/** Espera un email para `to` y devuelve su primer enlace que incluya `includes`. */
export async function waitForEmailLink({
  to,
  includes,
  timeoutMs = 15_000,
}: {
  to: string;
  includes: string;
  timeoutMs?: number;
}): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const messages = await readOutbox();
    // El más reciente primero, por si hay varios al mismo destinatario.
    for (const message of messages.reverse()) {
      if (message.to !== to) {
        continue;
      }
      const hrefs = [...message.html.matchAll(/href="([^"]+)"/g)];
      const link = hrefs
        .map((match) => match[1])
        .find((href) => href.includes(includes));
      if (link) {
        // El HTML escapa los `&` de la query.
        return link.replaceAll("&amp;", "&");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `No llegó ningún email a ${to} con «${includes}» en ${timeoutMs / 1000} segundos.`,
  );
}

async function readOutbox(): Promise<OutboxMessage[]> {
  try {
    const content = await readFile(OUTBOX_PATH, "utf8");
    return content
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as OutboxMessage);
  } catch {
    return [];
  }
}
