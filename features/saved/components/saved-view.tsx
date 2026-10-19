"use client";

import { Bookmark, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
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
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import {
  createCollection,
  deleteCollection,
  moveSavedItem,
  unsaveItem,
  updateCollection,
} from "../actions";
import type { CollectionSummary, SavedEntry } from "../queries";

/**
 * Guardados y colecciones (spec §5.8): favoritos de patrones, proyectos y
 * lanas. Se filtran por colección, se mueven con el selector de cada fila y
 * las colecciones se crean, editan y borran acá mismo (borrar no borra los
 * guardados: quedan en "Sin colección", D-052).
 */

type Visibility = "publico" | "privado";

/** Formulario de colección, compartido por el alta y la edición. */
function CollectionForm({
  initialName,
  initialVisibility,
  submitLabel,
  busyLabel,
  isPending,
  onSubmit,
  onCancel,
  testId,
}: {
  initialName: string;
  initialVisibility: Visibility;
  submitLabel: string;
  busyLabel: string;
  isPending: boolean;
  onSubmit: (name: string, visibility: Visibility) => void;
  onCancel: () => void;
  testId: string;
}) {
  const [name, setName] = useState(initialName);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);

  return (
    <form
      className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name, visibility);
      }}
      data-testid={testId}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${testId}-name`}>{es.saved.nameLabel}</Label>
        <Input
          id={`${testId}-name`}
          value={name}
          maxLength={60}
          placeholder={es.saved.namePlaceholder}
          onChange={(event) => setName(event.target.value)}
          data-testid="collection-name"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{es.saved.visibilityLabel}</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(
              chipStyles,
              visibility === "privado" ? chipSelected : chipIdle,
            )}
            aria-pressed={visibility === "privado"}
            onClick={() => setVisibility("privado")}
            data-testid="collection-visibility-private"
          >
            {es.saved.visibilityPrivate}
          </button>
          <button
            type="button"
            className={cn(
              chipStyles,
              visibility === "publico" ? chipSelected : chipIdle,
            )}
            aria-pressed={visibility === "publico"}
            onClick={() => setVisibility("publico")}
            data-testid="collection-visibility-public"
          >
            {es.saved.visibilityPublic}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          data-testid="collection-submit"
        >
          {isPending ? busyLabel : submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {es.saved.cancel}
        </Button>
      </div>
    </form>
  );
}

export function SavedView({
  items,
  collections,
}: {
  items: SavedEntry[];
  collections: CollectionSummary[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  /** "todos" | "sin" (sin colección) | id de colección. */
  const [filter, setFilter] = useState<string>("todos");
  const [creating, setCreating] = useState(false);
  const [editingCollection, setEditingCollection] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const withoutCollection = items.filter(
    (item) => item.collectionId === null,
  ).length;

  const visible = items.filter((item) => {
    if (filter === "todos") {
      return true;
    }
    if (filter === "sin") {
      return item.collectionId === null;
    }
    return item.collectionId === filter;
  });

  const current =
    filter !== "todos" && filter !== "sin"
      ? (collections.find((entry) => entry.id === filter) ?? null)
      : null;

  function submitCreate(name: string, visibility: Visibility) {
    startTransition(async () => {
      const result = await createCollection({ name, visibility });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.saved.created);
      setCreating(false);
      router.refresh();
    });
  }

  function submitEdit(name: string, visibility: Visibility) {
    if (!current) {
      return;
    }
    startTransition(async () => {
      const result = await updateCollection(current.id, { name, visibility });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.saved.edited);
      setEditingCollection(false);
      router.refresh();
    });
  }

  function removeCollection() {
    if (!current) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCollection(current.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.saved.deleted);
      setConfirmingDelete(false);
      setFilter("todos");
      router.refresh();
    });
  }

  function move(id: string, collectionId: string) {
    startTransition(async () => {
      const result = await moveSavedItem({ id, collectionId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.saved.moved);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await unsaveItem(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.saved.unsaved);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title={es.saved.emptyTitle}
        body={es.saved.emptyBody}
        action={
          <Button asChild variant="outline">
            <Link href="/explorar/patrones">{es.saved.emptyCta}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn(
            chipStyles,
            filter === "todos" ? chipSelected : chipIdle,
          )}
          aria-pressed={filter === "todos"}
          onClick={() => setFilter("todos")}
          data-testid="saved-filter-all"
        >
          {es.saved.filterAll} · {items.length}
        </button>
        {withoutCollection > 0 ? (
          <button
            type="button"
            className={cn(
              chipStyles,
              filter === "sin" ? chipSelected : chipIdle,
            )}
            aria-pressed={filter === "sin"}
            onClick={() => setFilter("sin")}
            data-testid="saved-filter-none"
          >
            {es.saved.filterNone} · {withoutCollection}
          </button>
        ) : null}
        {collections.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={cn(
              chipStyles,
              filter === entry.id ? chipSelected : chipIdle,
            )}
            aria-pressed={filter === entry.id}
            onClick={() => {
              setFilter(entry.id);
              setEditingCollection(false);
              setConfirmingDelete(false);
            }}
            data-testid="saved-filter-collection"
          >
            {entry.name} · {entry.count}
          </button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCreating((value) => !value)}
          aria-expanded={creating}
          data-testid="collection-new"
        >
          <Plus aria-hidden />
          {es.saved.newCta}
        </Button>
      </div>

      {creating ? (
        <CollectionForm
          initialName=""
          initialVisibility="privado"
          submitLabel={es.saved.create}
          busyLabel={es.saved.creating}
          isPending={isPending}
          onSubmit={submitCreate}
          onCancel={() => setCreating(false)}
          testId="collection-create-form"
        />
      ) : null}

      {current ? (
        <div
          className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4"
          data-testid="collection-detail"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold">
              {current.name}
            </h2>
            <Badge variant="outline">
              {current.visibility === "publico"
                ? es.saved.visibilityBadgePublic
                : es.saved.visibilityBadgePrivate}
            </Badge>
          </div>

          {editingCollection ? (
            <CollectionForm
              initialName={current.name}
              initialVisibility={current.visibility}
              submitLabel={es.saved.save}
              busyLabel={es.saved.saving}
              isPending={isPending}
              onSubmit={submitEdit}
              onCancel={() => setEditingCollection(false)}
              testId="collection-edit-form"
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingCollection(true)}
                data-testid="collection-edit"
              >
                <Pencil aria-hidden />
                {es.saved.editCta}
              </Button>
              {confirmingDelete ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  {es.saved.deleteConfirm}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={removeCollection}
                    data-testid="collection-delete-confirm"
                  >
                    {es.saved.deleteYes}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    {es.saved.deleteNo}
                  </Button>
                </span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                  data-testid="collection-delete"
                >
                  <Trash2 aria-hidden />
                  {es.saved.deleteCta}
                </Button>
              )}
            </div>
          )}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">{es.saved.filterEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="saved-list">
          {visible.map((item) => (
            <li
              key={item.id}
              className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              data-testid="saved-row"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {es.saved.typeLabels[item.target.type]}
                  </Badge>
                  <Link
                    href={item.target.href}
                    className="font-heading font-semibold underline-offset-4 hover:underline"
                    data-testid="saved-link"
                  >
                    {item.target.label}
                  </Link>
                </div>
                {item.target.subtitle ? (
                  <p className="text-muted-foreground text-sm">
                    {item.target.subtitle}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`saved-move-${item.id}`}>
                  {es.saved.moveLabel}
                </label>
                <select
                  id={`saved-move-${item.id}`}
                  className={selectStyles}
                  value={item.collectionId ?? ""}
                  disabled={isPending}
                  onChange={(event) => move(item.id, event.target.value)}
                  data-testid="saved-move-select"
                >
                  <option value="">{es.saved.moveNone}</option>
                  {collections.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={es.saved.removeLabel}
                  disabled={isPending}
                  onClick={() => remove(item.id)}
                  data-testid="saved-remove"
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
