"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  GripVertical,
  ListChecks,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { selectStyles } from "@/components/select-styles";
import {
  categoryLabel,
  craftLabel,
  formatDifficulty,
} from "@/features/pattern/format";
import { stashAvailability } from "@/features/stash/availability";
import type { StashListItem } from "@/features/stash/queries";
import { weightLabel } from "@/features/yarn/format";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { moveQueueItem, removeQueueItem, updateQueueItem } from "../actions";
import type { QueueEntry } from "../queries";

/**
 * "Quiero tejer" (spec §5.8): la cola de patrones, ordenable. En pantalla
 * grande se arrastra; en cualquier pantalla valen las flechas. La lana
 * planeada, la fecha objetivo y las notas se editan en el lugar.
 */

/** "Fil Piuma · Katia" o "Lana de mi abuela". */
function stashItemName(item: StashListItem): string {
  const name = item.yarn ? item.yarn.name : (item.customName ?? "");
  return item.yarn ? `${name} · ${item.yarn.brandName}` : name;
}

/** "20/11/2026": se muestra tal cual, sin pasar por zonas horarias. */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function QueueView({
  entries,
  stashItems,
}: {
  entries: QueueEntry[];
  stashItems: StashListItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plannedYarnId, setPlannedYarnId] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    before: boolean;
  } | null>(null);

  const stashById = new Map(stashItems.map((item) => [item.id, item]));

  function startEdit(entry: QueueEntry) {
    setEditingId(entry.id);
    setPlannedYarnId(entry.plannedStashItemId ?? "");
    setTargetDate(entry.targetDate ?? "");
    setNotes(entry.notes ?? "");
  }

  /** Índice destino en la lista sin la entrada movida (como la ve quien mira). */
  function targetIndexFor(id: string, offset: number): number {
    const index = entries.findIndex((entry) => entry.id === id);
    return Math.max(0, Math.min(index + offset, entries.length - 1));
  }

  function move(id: string, offset: -1 | 1) {
    startTransition(async () => {
      const result = await moveQueueItem({
        id,
        targetIndex: targetIndexFor(id, offset),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeQueueItem(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.queue.removed);
      router.refresh();
    });
  }

  function saveDetails(id: string) {
    startTransition(async () => {
      const result = await updateQueueItem({
        id,
        plannedStashItemId: plannedYarnId,
        targetDate,
        notes,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.queue.saved);
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDragOver(event: React.DragEvent<HTMLLIElement>, id: string) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    setDropTarget({ id, before });
  }

  function handleDrop(event: React.DragEvent<HTMLLIElement>, id: string) {
    event.preventDefault();
    if (!draggingId || draggingId === id) {
      setDraggingId(null);
      setDropTarget(null);
      return;
    }
    const rest = entries.filter((entry) => entry.id !== draggingId);
    const index = rest.findIndex((entry) => entry.id === id);
    const targetIndex = dropTarget && !dropTarget.before ? index + 1 : index;
    const movedId = draggingId;
    setDraggingId(null);
    setDropTarget(null);
    startTransition(async () => {
      const result = await moveQueueItem({ id: movedId, targetIndex });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title={es.queue.emptyTitle}
        body={es.queue.emptyBody}
        action={
          <Button asChild variant="outline">
            <Link href="/explorar/patrones">{es.queue.emptyCta}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">{es.queue.orderHint}</p>

      <ul className="flex flex-col gap-3" data-testid="queue-list">
        {entries.map((entry, index) => {
          const planned = entry.plannedStashItemId
            ? (stashById.get(entry.plannedStashItemId) ?? null)
            : null;
          const isDropTarget = dropTarget?.id === entry.id;
          const meta = [
            entry.designerName,
            entry.craft ? craftLabel(entry.craft) : null,
            categoryLabel(entry.category),
            entry.yarnWeight ? weightLabel(entry.yarnWeight) : null,
            entry.difficulty !== null
              ? formatDifficulty(entry.difficulty)
              : null,
          ].filter(Boolean);

          return (
            <li
              key={entry.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                setDraggingId(entry.id);
              }}
              onDragOver={(event) => handleDragOver(event, entry.id)}
              onDrop={(event) => handleDrop(event, entry.id)}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTarget(null);
              }}
              data-testid="queue-row"
              className={cn(
                "border-border bg-card flex flex-col gap-3 rounded-2xl border p-4",
                isDropTarget &&
                  (dropTarget?.before
                    ? "border-t-primary border-t-2"
                    : "border-b-primary border-b-2"),
                draggingId === entry.id && "opacity-60",
              )}
            >
              <div className="flex items-start gap-2">
                <span
                  className="text-muted-foreground hidden cursor-grab pt-1 sm:block"
                  aria-hidden
                >
                  <GripVertical className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/patrones/${entry.patternSlug}`}
                    className="font-heading font-semibold underline-offset-4 hover:underline"
                    data-testid="queue-pattern-link"
                  >
                    {entry.patternName}
                  </Link>
                  {meta.length > 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {meta.join(" · ")}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-1 text-sm">
                    {planned ? (
                      <span data-testid="queue-planned-yarn">
                        {stashItemName(planned)} ·{" "}
                        {stashAvailability(planned).text}
                      </span>
                    ) : (
                      <span data-testid="queue-planned-yarn">
                        {es.queue.plannedYarnNone}
                      </span>
                    )}
                    {entry.targetDate ? (
                      <>
                        {" · "}
                        <span
                          className="inline-flex items-center gap-1"
                          data-testid="queue-target-date"
                        >
                          <CalendarDays className="size-3.5" aria-hidden />
                          {es.queue.datePrefix} {formatDate(entry.targetDate)}
                        </span>
                      </>
                    ) : null}
                  </p>
                  {entry.notes ? (
                    <p
                      className="text-muted-foreground mt-1 text-sm italic"
                      data-testid="queue-notes"
                    >
                      «{entry.notes}»
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={es.queue.upLabel}
                    disabled={index === 0 || isPending}
                    onClick={() => move(entry.id, -1)}
                    data-testid="queue-move-up"
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={es.queue.downLabel}
                    disabled={index === entries.length - 1 || isPending}
                    onClick={() => move(entry.id, 1)}
                    data-testid="queue-move-down"
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={es.queue.removeLabel}
                    disabled={isPending}
                    onClick={() => remove(entry.id)}
                    data-testid="queue-remove"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    editingId === entry.id
                      ? setEditingId(null)
                      : startEdit(entry)
                  }
                  aria-expanded={editingId === entry.id}
                  data-testid="queue-edit"
                >
                  <Pencil aria-hidden />
                  {es.queue.detailsCta}
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link
                    href={`/mi-tejido/proyectos/nuevo?patron=${entry.patternSlug}`}
                    data-testid="queue-start"
                  >
                    {es.queue.startCta}
                  </Link>
                </Button>
              </div>

              {editingId === entry.id ? (
                <form
                  className="border-border flex flex-col gap-3 border-t pt-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveDetails(entry.id);
                  }}
                  data-testid="queue-edit-form"
                >
                  {stashItems.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`queue-yarn-${entry.id}`}>
                        {es.queue.plannedYarnLabel}
                      </Label>
                      <select
                        id={`queue-yarn-${entry.id}`}
                        className={selectStyles}
                        value={plannedYarnId}
                        onChange={(event) =>
                          setPlannedYarnId(event.target.value)
                        }
                        data-testid="queue-planned-select"
                      >
                        <option value="">
                          {es.queue.plannedYarnPlaceholder}
                        </option>
                        {stashItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {stashItemName(item)} ·{" "}
                            {stashAvailability(item).text}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {es.queue.plannedYarnEmpty}{" "}
                      <Link
                        href="/mi-tejido/lanas"
                        className="underline underline-offset-4"
                      >
                        {es.queue.plannedYarnEmptyCta}
                      </Link>
                    </p>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`queue-date-${entry.id}`}>
                      {es.queue.targetDateLabel}
                    </Label>
                    <Input
                      id={`queue-date-${entry.id}`}
                      type="date"
                      value={targetDate}
                      onChange={(event) => setTargetDate(event.target.value)}
                      data-testid="queue-target-date-input"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`queue-notes-${entry.id}`}>
                      {es.queue.notesLabel}
                    </Label>
                    <Textarea
                      id={`queue-notes-${entry.id}`}
                      rows={2}
                      value={notes}
                      maxLength={300}
                      placeholder={es.queue.notesPlaceholder}
                      onChange={(event) => setNotes(event.target.value)}
                      data-testid="queue-notes-input"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isPending}
                      data-testid="queue-save-details"
                    >
                      {isPending ? es.queue.saving : es.queue.save}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      {es.queue.cancel}
                    </Button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
