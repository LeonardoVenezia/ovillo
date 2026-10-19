"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { es } from "@/messages/es";

import { markSolution } from "../thread-actions";

/**
 * Marca (o desmarca) una respuesta como solución: puede quien abrió la
 * pregunta o la moderación del grupo (D-055). La acción alterna sola.
 */
export function SolutionButton({
  threadId,
  postId,
  solved,
}: {
  threadId: string;
  postId: string;
  solved: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await markSolution({ threadId, postId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        solved ? es.community.solutionUnmarked : es.community.solutionMarked,
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={solved ? "secondary" : "outline"}
      disabled={isPending}
      onClick={onClick}
      data-testid="solution-button"
    >
      <CheckCircle2 aria-hidden="true" />
      {solved ? es.community.solutionUnmarkCta : es.community.solutionMarkCta}
    </Button>
  );
}
