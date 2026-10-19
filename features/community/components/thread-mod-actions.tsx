"use client";

import { Lock, LockOpen, Pin, PinOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { es } from "@/messages/es";

import { setThreadFlag } from "../thread-actions";

/**
 * Controles de moderación del hilo (spec §5.9): fijar arriba y cerrar (o
 * reabrir) las respuestas. Solo se muestran a dueña/o y moderadores del
 * grupo; la acción revalida el permiso igual.
 */
export function ThreadModActions({
  threadId,
  pinned,
  locked,
}: {
  threadId: string;
  pinned: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(flag: "pinned" | "locked", value: boolean, message: string) {
    startTransition(async () => {
      const result = await setThreadFlag({ threadId, flag, value });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2" data-testid="thread-mod-actions">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        data-testid="thread-pin-button"
        onClick={() =>
          toggle(
            "pinned",
            !pinned,
            pinned ? es.community.unpinnedDone : es.community.pinnedDone,
          )
        }
      >
        {pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
        {pinned ? es.community.unpinCta : es.community.pinCta}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        data-testid="thread-lock-button"
        onClick={() =>
          toggle(
            "locked",
            !locked,
            locked ? es.community.unlockedDone : es.community.lockedDone,
          )
        }
      >
        {locked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
        {locked ? es.community.unlockCta : es.community.lockCta}
      </Button>
    </div>
  );
}
