"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { es } from "@/messages/es";

import { deleteProject } from "../actions";

/** Eliminar un proyecto con confirmación en dos pasos, sin modal. */
export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.projects.deleted);
      router.push("/mi-tejido/proyectos");
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="text-destructive hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        {es.projects.deleteCta}
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">
        {es.projects.deleteConfirm}
      </span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={handleDelete}
      >
        {isPending ? es.projects.deleting : es.projects.deleteYes}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        {es.projects.deleteNo}
      </Button>
    </span>
  );
}
