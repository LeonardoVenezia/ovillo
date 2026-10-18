import type { ProjectStatus } from "@/db/project-schema";

import { thumbUrlFor } from "./media-view";
import type { CommunityProjectRow } from "./queries";

/**
 * Filas de la galería "hechos por la comunidad" listas para la UI: la clave
 * de R2 ya convertida en URL. Sin `R2_PUBLIC_URL` las tarjetas muestran su
 * marcador de posición, igual que en el resto de las fotos.
 */

export type CommunityProjectItem = {
  id: string;
  slug: string;
  name: string;
  status: ProjectStatus;
  /** `privado` = la ve solo su dueña (se marca en la tarjeta). */
  visibility: string;
  ownerName: string;
  ownerUsername: string;
  ownerImage: string | null;
  coverUrl: string | null;
};

/**
 * Quien no eligió `@usuario` no tiene página pública donde vivir, así que su
 * proyecto no puede entrar a la galería (igual que en el perfil).
 */
export function toCommunityProjectItems(
  rows: CommunityProjectRow[],
): CommunityProjectItem[] {
  return rows.flatMap((row) => {
    if (!row.ownerUsername) {
      return [];
    }
    return [
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        visibility: row.visibility,
        ownerName: row.ownerName,
        ownerUsername: row.ownerUsername,
        ownerImage: row.ownerImage,
        coverUrl: row.cover ? thumbUrlFor(row.cover.r2Key) : null,
      },
    ];
  });
}
