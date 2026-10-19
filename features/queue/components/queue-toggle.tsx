"use client";

import { ListChecks, ListPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { es } from "@/messages/es";

import { addToQueue, removeQueueItem } from "../actions";

/**
 * Interruptor "Quiero tejer" de la ficha de patrón (spec §5.5 y §5.8): suma
 * o quita el patrón de la cola sin dejar la página. Sin sesión, manda a
 * ingresar con vuelta a la ficha.
 */
export function QueueToggle({
  patternId,
  initialEntryId,
  signedIn,
}: {
  patternId: string;
  initialEntryId: string | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [entryId, setEntryId] = useState(initialEntryId);

  const queued = entryId !== null;

  function onClick() {
    if (!signedIn) {
      router.push(`/ingresar?volver=${encodeURIComponent(pathname)}`);
      return;
    }

    startTransition(async () => {
      if (entryId) {
        const result = await removeQueueItem(entryId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setEntryId(null);
        toast.success(es.queue.removed);
        router.refresh();
        return;
      }

      const result = await addToQueue({ patternId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEntryId(result.id);
      toast.success(es.queue.added);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={queued ? "secondary" : "outline"}
      onClick={onClick}
      disabled={isPending}
      data-testid="queue-toggle"
    >
      {queued ? <ListChecks aria-hidden /> : <ListPlus aria-hidden />}
      {queued ? es.queue.inQueueCta : es.queue.addCta}
    </Button>
  );
}
