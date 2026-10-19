"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectStyles } from "@/components/select-styles";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import { weightLabel } from "@/features/yarn/format";
import type { YarnOption } from "@/features/yarn/queries";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import {
  addProjectYarn,
  removeProjectYarn,
  updateProjectYarnUsage,
} from "../actions";
import { stashAvailability } from "../availability";
import type { ProjectYarnItem, StashListItem } from "../queries";
import { parseCountInput } from "../schemas";

/**
 * Lanas del proyecto (spec §5.3): asignar del inventario o del catálogo,
 * corregir lo usado y quitarlas. La lana del inventario no se muta: la
 * disponible la calcula la consulta, así frogear la devuelve sola (D-045).
 */

/** "Fil Piuma · Katia" o "Lana de mi abuela". */
function stashItemName(item: StashListItem): string {
  const name = item.yarn ? item.yarn.name : (item.customName ?? "");
  return item.yarn ? `${name} · ${item.yarn.brandName}` : name;
}

/** "1 ovillo · 150 g": solo las cantidades cargadas. */
function usageParts(yarn: ProjectYarnItem): string[] {
  const parts: string[] = [];
  if (yarn.skeinsUsed !== null) {
    parts.push(
      yarn.skeinsUsed === 1
        ? es.stash.skeinsShortOne
        : es.stash.skeinsShort.replace("{count}", String(yarn.skeinsUsed)),
    );
  }
  if (yarn.gramsUsed !== null) {
    parts.push(es.stash.gramsShort.replace("{count}", String(yarn.gramsUsed)));
  }
  return parts;
}

export function ProjectYarns({
  projectId,
  yarns,
  stashItems,
  catalogOptions,
}: {
  projectId: string;
  yarns: ProjectYarnItem[];
  stashItems: StashListItem[];
  catalogOptions: YarnOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [source, setSource] = useState<"inventario" | "catalogo">(
    stashItems.length > 0 ? "inventario" : "catalogo",
  );
  const [stashItemId, setStashItemId] = useState("");
  const [catalogYarnId, setCatalogYarnId] = useState("");
  const [skeins, setSkeins] = useState("");
  const [grams, setGrams] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSkeins, setEditSkeins] = useState("");
  const [editGrams, setEditGrams] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function resetAdd() {
    setAdding(false);
    setSkeins("");
    setGrams("");
    setStashItemId("");
    setCatalogYarnId("");
  }

  function submitAdd() {
    const parsedSkeins = parseCountInput(skeins);
    const parsedGrams = parseCountInput(grams);
    if (parsedSkeins === "invalid" || parsedGrams === "invalid") {
      toast.error(es.stash.errors.quantityRequired);
      return;
    }
    if (parsedSkeins === null && parsedGrams === null) {
      toast.error(es.projects.yarns.errors.quantity);
      return;
    }
    const chosenId = source === "inventario" ? stashItemId : catalogYarnId;
    if (chosenId === "") {
      toast.error(es.projects.yarns.errors.required);
      return;
    }

    startTransition(async () => {
      const result = await addProjectYarn({
        projectId,
        stashItemId: source === "inventario" ? chosenId : null,
        yarnId: source === "catalogo" ? chosenId : null,
        skeinsUsed: parsedSkeins,
        gramsUsed: parsedGrams,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.projects.yarns.added);
      resetAdd();
      router.refresh();
    });
  }

  function startEdit(yarn: ProjectYarnItem) {
    setEditingId(yarn.id);
    setEditSkeins(yarn.skeinsUsed === null ? "" : String(yarn.skeinsUsed));
    setEditGrams(yarn.gramsUsed === null ? "" : String(yarn.gramsUsed));
  }

  function submitEdit(id: string) {
    const parsedSkeins = parseCountInput(editSkeins);
    const parsedGrams = parseCountInput(editGrams);
    if (
      parsedSkeins === "invalid" ||
      parsedGrams === "invalid" ||
      (parsedSkeins === null && parsedGrams === null)
    ) {
      toast.error(es.projects.yarns.errors.quantity);
      return;
    }

    startTransition(async () => {
      const result = await updateProjectYarnUsage({
        id,
        skeinsUsed: parsedSkeins,
        gramsUsed: parsedGrams,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.projects.yarns.saved);
      setEditingId(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeProjectYarn(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.projects.yarns.removed);
      setConfirmingId(null);
      router.refresh();
    });
  }

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="project-yarns"
      aria-label={es.projects.yarns.title}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">
          {es.projects.yarns.title}
        </h2>
        {!adding ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="project-yarn-add"
            onClick={() => setAdding(true)}
          >
            <Plus aria-hidden />
            {es.projects.yarns.addCta}
          </Button>
        ) : null}
      </div>

      {yarns.length === 0 ? (
        <p
          className="border-border text-muted-foreground rounded-2xl border border-dashed p-4 text-sm"
          data-testid="project-yarns-empty"
        >
          {es.projects.yarns.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {yarns.map((yarn) => {
            const stashItem = yarn.stashItemId
              ? (stashItems.find((item) => item.id === yarn.stashItemId) ??
                null)
              : null;
            const available = stashItem ? stashAvailability(stashItem) : null;
            const usage = usageParts(yarn);
            const meta = [
              yarn.brandName,
              yarn.colorway,
              yarn.weight ? weightLabel(yarn.weight) : null,
            ]
              .filter((part): part is string => part !== null)
              .join(" · ");

            return (
              <li
                key={yarn.id}
                className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4"
                data-testid="project-yarn-row"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p
                      className="font-heading font-semibold"
                      data-testid="project-yarn-name"
                    >
                      {yarn.name}
                    </p>
                    {meta ? (
                      <p className="text-muted-foreground text-sm">{meta}</p>
                    ) : null}
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {yarn.fromStash
                          ? es.projects.yarns.fromStashTag
                          : es.projects.yarns.fromCatalogTag}
                      </Badge>
                      {usage.length > 0 ? (
                        <span
                          className="text-sm"
                          data-testid="project-yarn-usage"
                        >
                          {usage.join(" · ")}
                        </span>
                      ) : null}
                    </span>
                    {available ? (
                      <p
                        className={cn(
                          "text-xs",
                          available.warn
                            ? "text-amber-600 dark:text-amber-500"
                            : "text-muted-foreground",
                        )}
                        data-testid="project-yarn-available"
                      >
                        {available.text}
                      </p>
                    ) : null}
                  </div>

                  {editingId !== yarn.id ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      {confirmingId === yarn.id ? (
                        <>
                          <span className="text-muted-foreground text-sm">
                            {es.projects.yarns.removeConfirm}
                          </span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isPending}
                            onClick={() => remove(yarn.id)}
                          >
                            {es.projects.yarns.removeYes}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingId(null)}
                          >
                            {es.projects.yarns.removeNo}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            data-testid="project-yarn-edit"
                            onClick={() => startEdit(yarn)}
                          >
                            <Pencil aria-hidden />
                            {es.projects.yarns.editCta}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            data-testid="project-yarn-remove"
                            onClick={() => setConfirmingId(yarn.id)}
                          >
                            <Trash2 aria-hidden />
                            {es.projects.yarns.removeCta}
                          </Button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>

                {editingId === yarn.id ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor={`project-yarn-edit-skeins-${yarn.id}`}
                        className="font-normal"
                      >
                        {es.projects.yarns.skeinsUsedLabel}
                      </Label>
                      <Input
                        id={`project-yarn-edit-skeins-${yarn.id}`}
                        data-testid="project-yarn-edit-skeins"
                        inputMode="numeric"
                        value={editSkeins}
                        onChange={(event) => setEditSkeins(event.target.value)}
                        className="w-full sm:w-28"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label
                        htmlFor={`project-yarn-edit-grams-${yarn.id}`}
                        className="font-normal"
                      >
                        {es.projects.yarns.gramsUsedLabel}
                      </Label>
                      <Input
                        id={`project-yarn-edit-grams-${yarn.id}`}
                        data-testid="project-yarn-edit-grams"
                        inputMode="numeric"
                        value={editGrams}
                        onChange={(event) => setEditGrams(event.target.value)}
                        className="w-full sm:w-28"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isPending}
                        data-testid="project-yarn-edit-save"
                        onClick={() => submitEdit(yarn.id)}
                      >
                        {isPending
                          ? es.projects.yarns.saving
                          : es.projects.yarns.save}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        {es.projects.yarns.cancel}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">{es.projects.yarns.hint}</p>

      {adding ? (
        <div className="border-border flex flex-col gap-4 rounded-2xl border p-4">
          <h3 className="font-heading font-semibold">
            {es.projects.yarns.addTitle}
          </h3>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">
              {es.projects.yarns.fromLabel}
            </span>
            <div className="flex flex-wrap gap-2" role="group">
              <button
                type="button"
                aria-pressed={source === "inventario"}
                data-testid="project-yarn-source-stash"
                className={cn(
                  chipStyles,
                  source === "inventario" ? chipSelected : chipIdle,
                )}
                onClick={() => setSource("inventario")}
              >
                {es.projects.yarns.fromStash}
              </button>
              <button
                type="button"
                aria-pressed={source === "catalogo"}
                data-testid="project-yarn-source-catalog"
                className={cn(
                  chipStyles,
                  source === "catalogo" ? chipSelected : chipIdle,
                )}
                onClick={() => setSource("catalogo")}
              >
                {es.projects.yarns.fromCatalog}
              </button>
            </div>
          </div>

          {source === "inventario" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-yarn-stash">
                {es.projects.yarns.stashLabel}
              </Label>
              {stashItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {es.projects.yarns.stashNone}{" "}
                  <Link
                    href="/mi-tejido/lanas"
                    className="underline underline-offset-4"
                  >
                    {es.projects.yarns.stashNoneCta}
                  </Link>
                </p>
              ) : (
                <select
                  id="project-yarn-stash"
                  data-testid="project-yarn-stash-select"
                  className={selectStyles}
                  value={stashItemId}
                  onChange={(event) => setStashItemId(event.target.value)}
                >
                  <option value="">{es.projects.yarns.stashPlaceholder}</option>
                  {stashItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {stashItemName(item)} · {stashAvailability(item).text}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-yarn-catalog">
                {es.projects.yarns.catalogLabel}
              </Label>
              <select
                id="project-yarn-catalog"
                data-testid="project-yarn-catalog-select"
                className={selectStyles}
                value={catalogYarnId}
                onChange={(event) => setCatalogYarnId(event.target.value)}
              >
                <option value="">{es.projects.yarns.catalogPlaceholder}</option>
                {catalogOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {es.stash.yarnOption
                      .replace("{brand}", option.brandName)
                      .replace("{name}", option.name)}{" "}
                    · {weightLabel(option.weight)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-yarn-skeins" className="font-normal">
                {es.projects.yarns.skeinsUsedLabel}
              </Label>
              <Input
                id="project-yarn-skeins"
                data-testid="project-yarn-skeins"
                inputMode="numeric"
                value={skeins}
                onChange={(event) => setSkeins(event.target.value)}
                className="w-full sm:w-28"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-yarn-grams" className="font-normal">
                {es.projects.yarns.gramsUsedLabel}
              </Label>
              <Input
                id="project-yarn-grams"
                data-testid="project-yarn-grams"
                inputMode="numeric"
                value={grams}
                onChange={(event) => setGrams(event.target.value)}
                className="w-full sm:w-28"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            {es.projects.yarns.quantityHint}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={isPending}
              data-testid="project-yarn-submit"
              onClick={submitAdd}
            >
              {isPending
                ? es.projects.yarns.submitting
                : es.projects.yarns.submit}
            </Button>
            <Button type="button" variant="ghost" onClick={resetAdd}>
              {es.projects.yarns.cancel}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
