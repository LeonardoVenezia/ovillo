import type { SavedType } from "@/db/saved-schema";
import { getOptionalUser } from "@/lib/session";

import { getSavedItem } from "../queries";
import { SaveToggle } from "./save-toggle";

/**
 * "Guardar" de una ficha (patrón, lana o proyecto): lee la sesión y el estado
 * del guardado. Va **dentro de un `<Suspense>`**, porque las fichas se
 * cachean y la sesión se lee al momento (patrón de `getOptionalUser`).
 */
export async function SavedButton({
  targetType,
  targetId,
}: {
  targetType: SavedType;
  targetId: string;
}) {
  const viewer = await getOptionalUser();
  const saved = viewer
    ? await getSavedItem(viewer.id, targetType, targetId)
    : null;

  return (
    <SaveToggle
      targetType={targetType}
      targetId={targetId}
      initialSavedItemId={saved?.id ?? null}
      signedIn={Boolean(viewer)}
    />
  );
}
