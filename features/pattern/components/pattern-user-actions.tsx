import { QueueToggle } from "@/features/queue/components/queue-toggle";
import { getQueueEntry } from "@/features/queue/queries";
import { SaveToggle } from "@/features/saved/components/save-toggle";
import { getSavedItem } from "@/features/saved/queries";
import { getOptionalUser } from "@/lib/session";

/**
 * Acciones con sesión de la ficha de patrón (spec §5.5): "Quiero tejer" y
 * "Guardar", las dos como interruptor. Va bajo `<Suspense>` en la ficha,
 * porque la página se sirve cacheada y esto se resuelve al momento.
 */
export async function PatternUserActions({ patternId }: { patternId: string }) {
  const viewer = await getOptionalUser();

  const [queueEntry, saved] = viewer
    ? await Promise.all([
        getQueueEntry(viewer.id, patternId),
        getSavedItem(viewer.id, "patron", patternId),
      ])
    : [null, null];

  return (
    <>
      <QueueToggle
        patternId={patternId}
        initialEntryId={queueEntry?.id ?? null}
        signedIn={Boolean(viewer)}
      />
      <SaveToggle
        targetType="patron"
        targetId={patternId}
        initialSavedItemId={saved?.id ?? null}
        signedIn={Boolean(viewer)}
      />
    </>
  );
}
