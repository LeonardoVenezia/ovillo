"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { selectStyles } from "@/components/select-styles";
import { es } from "@/messages/es";

import { addProjectTool, removeProjectTool } from "../actions";
import type { ProjectToolItem, Tool } from "../queries";
import { equivalenceLabel, formatMm } from "../sizes";

/**
 * Agujas y ganchos de un proyecto (spec §5.3): se eligen del inventario de
 * herramientas y no descuentan nada (la misma aguja sirve para varios
 * proyectos a la vez). Es informativo.
 */

/** "Agujas circulares 4 mm · US 6 · UK 8 · cable 80 cm". */
function toolLabel(tool: Tool): string {
  const parts = [
    `${es.tools.kinds[tool.kind]} ${formatMm(tool.sizeMm)} ${es.tools.sizeSuffix}`,
    equivalenceLabel(tool.kind, tool.sizeMm),
    tool.lengthCm !== null
      ? es.tools.cableShort.replace("{cm}", String(tool.lengthCm))
      : null,
  ].filter((part): part is string => part !== null);
  return parts.join(" · ");
}

export function ProjectTools({
  projectId,
  tools,
  options,
}: {
  projectId: string;
  tools: ProjectToolItem[];
  options: Tool[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Las que ya están no se vuelven a ofrecer (el vínculo es único).
  const available = options.filter(
    (option) => !tools.some((tool) => tool.id === option.id),
  );

  function add() {
    if (selected === "") {
      toast.error(es.projects.tools.errors.required);
      return;
    }
    startTransition(async () => {
      const result = await addProjectTool({ projectId, toolId: selected });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.projects.tools.added);
      setSelected("");
      router.refresh();
    });
  }

  function remove(linkId: string) {
    startTransition(async () => {
      const result = await removeProjectTool(linkId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.projects.tools.removed);
      setConfirmingId(null);
      router.refresh();
    });
  }

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="project-tools"
      aria-label={es.projects.tools.title}
    >
      <h2 className="font-heading text-lg font-semibold">
        {es.projects.tools.title}
      </h2>

      {tools.length === 0 ? (
        <p
          className="border-border text-muted-foreground rounded-2xl border border-dashed p-4 text-sm"
          data-testid="project-tools-empty"
        >
          {es.projects.tools.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tools.map((tool) => (
            <li
              key={tool.linkId}
              className="border-border bg-card flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3"
              data-testid="project-tool-row"
            >
              <span className="text-sm">{toolLabel(tool)}</span>
              {confirmingId === tool.linkId ? (
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    {es.projects.tools.removeConfirm}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => remove(tool.linkId)}
                  >
                    {es.projects.tools.removeYes}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingId(null)}
                  >
                    {es.projects.tools.removeNo}
                  </Button>
                </span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="project-tool-remove"
                  onClick={() => setConfirmingId(tool.linkId)}
                >
                  <Trash2 aria-hidden />
                  {es.projects.tools.removeCta}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">{es.projects.tools.hint}</p>

      {options.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {es.projects.tools.none}{" "}
          <Link
            href="/mi-tejido/herramientas"
            className="underline underline-offset-4"
          >
            {es.projects.tools.noneCta}
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="project-tool-select">
              {es.projects.tools.addLabel}
            </Label>
            <select
              id="project-tool-select"
              data-testid="project-tool-select"
              className={selectStyles}
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">{es.projects.tools.selectPlaceholder}</option>
              {available.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {toolLabel(tool)}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={isPending}
            data-testid="project-tool-add"
            onClick={add}
          >
            <Plus aria-hidden />
            {es.projects.tools.add}
          </Button>
        </div>
      )}
    </section>
  );
}
