"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { SavedType } from "@/db/saved-schema";
import { es } from "@/messages/es";

import { saveItem, unsaveItem } from "../actions";

/**
 * Interruptor "Guardar" de las fichas (spec §5.8): guarda cualquier patrón,
 * proyecto o lana y vuelve a tocar para quitar. Sin sesión, manda a ingresar
 * con vuelta a esta misma página (como "Con mi lana").
 */
export function SaveToggle({
  targetType,
  targetId,
  initialSavedItemId,
  signedIn,
}: {
  targetType: SavedType;
  targetId: string;
  initialSavedItemId: string | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [savedId, setSavedId] = useState(initialSavedItemId);

  const saved = savedId !== null;

  function onClick() {
    if (!signedIn) {
      router.push(`/ingresar?volver=${encodeURIComponent(pathname)}`);
      return;
    }

    startTransition(async () => {
      if (savedId) {
        const result = await unsaveItem(savedId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setSavedId(null);
        toast.success(es.saved.unsaved);
        router.refresh();
        return;
      }

      const result = await saveItem({ targetType, targetId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSavedId(result.id);
      toast.success(es.saved.saved);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      onClick={onClick}
      disabled={isPending}
      data-testid="save-toggle"
    >
      {saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
      {saved ? es.saved.savedCta : es.saved.saveCta}
    </Button>
  );
}
