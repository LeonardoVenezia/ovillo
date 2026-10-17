"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { PROJECT_STATUSES, type ProjectStatus } from "@/db/project-schema";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { setProjectStatus } from "../actions";
import { chipIdle, chipSelected, chipStyles } from "./chip-styles";

/** Cambio rápido de estado desde la página del proyecto. */
export function ProjectStatusPicker({
  projectId,
  status,
}: {
  projectId: string;
  status: ProjectStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(next: ProjectStatus) {
    if (next === status) {
      return;
    }
    startTransition(async () => {
      const result = await setProjectStatus(projectId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        next === "terminado" ? es.projects.finished : es.projects.statusChanged,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2" aria-busy={isPending}>
      {PROJECT_STATUSES.map((value) => {
        const selected = value === status;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            className={cn(chipStyles, selected ? chipSelected : chipIdle)}
            onClick={() => choose(value)}
          >
            {es.projects.statusLabels[value]}
          </button>
        );
      })}
    </div>
  );
}
