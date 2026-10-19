"use client";

import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLOR_FAMILIES, type ColorFamily } from "@/db/stash-schema";
import { YARN_WEIGHTS, type YarnWeight } from "@/db/yarn-schema";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import type { YarnOption } from "@/features/yarn/queries";
import { normalizeText } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { deleteStashItem } from "../actions";
import { stashAvailability } from "../availability";
import { colorFamilySwatch } from "../colors";
import type { StashListItem } from "../queries";
import { StashForm } from "./stash-form";

/**
 * Inventario de lana (spec §5.7): grilla con filtros rápidos por color y
 * grosor, búsqueda y alta/edición/borrado en línea. Solo lo ve su dueña.
 *
 * La cantidad asignada a proyectos viene calculada de la consulta; las
 * tarjetas muestran la disponible (total − asignada) sin volver a operar.
 */

/** Grosor que se muestra: el del catálogo si está vinculada, si no el propio. */
function effectiveWeight(item: StashListItem): YarnWeight | null {
  return item.yarn?.weight ?? item.weight;
}

function itemName(item: StashListItem): string {
  return item.yarn ? item.yarn.name : (item.customName ?? "");
}

/** "3 ovillos · 300 g · 450 m": solo las cantidades cargadas. */
function quantityParts(item: StashListItem): string[] {
  const parts: string[] = [];
  if (item.skeins !== null) {
    parts.push(
      item.skeins === 1
        ? es.stash.skeinsShortOne
        : es.stash.skeinsShort.replace("{count}", String(item.skeins)),
    );
  }
  if (item.grams !== null) {
    parts.push(es.stash.gramsShort.replace("{count}", String(item.grams)));
  }
  if (item.metersTotal !== null) {
    parts.push(
      es.stash.metersShort.replace("{count}", String(item.metersTotal)),
    );
  }
  return parts;
}

export function StashView({
  items,
  yarnOptions,
  initialCreating = false,
}: {
  items: StashListItem[];
  yarnOptions: YarnOption[];
  initialCreating?: boolean;
}) {
  const [creating, setCreating] = useState(initialCreating);
  const [query, setQuery] = useState("");
  const [colorFilter, setColorFilter] = useState<ColorFamily | "todos">(
    "todos",
  );
  const [weightFilter, setWeightFilter] = useState<YarnWeight | "todos">(
    "todos",
  );

  const presentColors = useMemo(
    () =>
      COLOR_FAMILIES.filter((family) =>
        items.some((item) => item.colorFamily === family),
      ),
    [items],
  );
  const presentWeights = useMemo(
    () =>
      YARN_WEIGHTS.filter((weight) =>
        items.some((item) => effectiveWeight(item) === weight),
      ),
    [items],
  );

  const visible = useMemo(() => {
    const needle = normalizeText(query);
    return items.filter((item) => {
      if (colorFilter !== "todos" && item.colorFamily !== colorFilter) {
        return false;
      }
      if (weightFilter !== "todos" && effectiveWeight(item) !== weightFilter) {
        return false;
      }
      if (needle.length > 0) {
        const haystack = normalizeText(
          [
            itemName(item),
            item.yarn?.brandName ?? "",
            item.colorway ?? "",
            item.colorFamily ? es.stash.colors[item.colorFamily] : "",
            item.location ?? "",
            item.dyeLot ?? "",
          ].join(" "),
        );
        if (!haystack.includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [items, query, colorFilter, weightFilter]);

  return (
    <section className="flex flex-col gap-4" data-testid="stash-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!creating ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setCreating(true)}
              data-testid="stash-new-cta"
            >
              <Plus aria-hidden="true" />
              {es.stash.newCta}
            </Button>
          ) : null}
          {items.length > 0 ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="stash-count"
            >
              {visible.length === 1
                ? es.stash.countOne
                : es.stash.count.replace("{count}", String(visible.length))}
            </p>
          ) : null}
        </div>
      </div>

      {creating ? (
        <StashForm
          yarnOptions={yarnOptions}
          onDone={() => setCreating(false)}
        />
      ) : null}

      {items.length === 0 && !creating ? (
        <EmptyState
          icon={Package}
          title={es.stash.emptyTitle}
          body={es.stash.emptyBody}
          action={
            <Button
              size="lg"
              type="button"
              onClick={() => setCreating(true)}
              data-testid="stash-first-cta"
            >
              {es.stash.firstCta}
            </Button>
          }
        />
      ) : null}

      {items.length > 0 ? (
        <div className="flex flex-col gap-3">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={es.stash.searchPlaceholder}
            aria-label={es.stash.searchLabel}
            data-testid="stash-search"
          />

          {presentColors.length > 0 ? (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={es.stash.colorFilterLabel}
            >
              <FilterChip
                label={es.stash.colorAll}
                active={colorFilter === "todos"}
                testId="stash-filter-color-todos"
                onClick={() => setColorFilter("todos")}
              />
              {presentColors.map((family) => (
                <FilterChip
                  key={family}
                  label={es.stash.colors[family]}
                  swatch={colorFamilySwatch[family]}
                  active={colorFilter === family}
                  testId={`stash-filter-color-${family}`}
                  onClick={() => setColorFilter(family)}
                />
              ))}
            </div>
          ) : null}

          {presentWeights.length > 0 ? (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={es.stash.weightFilterLabel}
            >
              <FilterChip
                label={es.stash.weightAll}
                active={weightFilter === "todos"}
                testId="stash-filter-weight-todos"
                onClick={() => setWeightFilter("todos")}
              />
              {presentWeights.map((weight) => (
                <FilterChip
                  key={weight}
                  label={es.yarns.weights[weight]}
                  active={weightFilter === weight}
                  testId={`stash-filter-weight-${weight}`}
                  onClick={() => setWeightFilter(weight)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {items.length > 0 && visible.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="stash-filter-empty"
        >
          {es.stash.filterEmpty}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="stash-grid">
          {visible.map((item) => (
            <StashCard key={item.id} item={item} yarnOptions={yarnOptions} />
          ))}
        </ul>
      ) : null}

      {items.length > 0 ? (
        <p className="text-muted-foreground text-xs">{es.stash.listHint}</p>
      ) : null}
    </section>
  );
}

function FilterChip({
  label,
  swatch,
  active,
  testId,
  onClick,
}: {
  label: string;
  swatch?: string;
  active: boolean;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        chipStyles,
        "inline-flex items-center gap-1.5",
        active ? chipSelected : chipIdle,
      )}
      onClick={onClick}
    >
      {swatch ? (
        <span
          aria-hidden="true"
          className={cn("size-3.5 rounded-full", swatch)}
        />
      ) : null}
      {label}
    </button>
  );
}

function StashCard({
  item,
  yarnOptions,
}: {
  item: StashListItem;
  yarnOptions: YarnOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const weight = effectiveWeight(item);
  const meta = [
    item.yarn ? item.yarn.brandName : null,
    weight ? es.yarns.weights[weight] : null,
    item.dyeLot ? es.stash.dyeLotShort.replace("{lot}", item.dyeLot) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
  const quantities = quantityParts(item);
  const available = stashAvailability(item);
  const assigned = item.assignedSkeins > 0 || item.assignedGrams > 0;

  function remove() {
    startTransition(async () => {
      const result = await deleteStashItem(item.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.stash.deleted);
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <li
      className="border-border bg-card flex gap-3 rounded-2xl border p-4"
      data-testid="stash-row"
    >
      {editing ? (
        <div className="min-w-0 flex-1">
          <StashForm
            item={item}
            yarnOptions={yarnOptions}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          {item.imageThumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- miniatura pública de R2
            <img
              src={item.imageThumbUrl}
              alt=""
              className="border-border size-20 shrink-0 rounded-xl border object-cover"
              data-testid="stash-row-photo"
            />
          ) : (
            <div
              className={cn(
                "size-20 shrink-0 rounded-xl",
                item.colorFamily
                  ? colorFamilySwatch[item.colorFamily]
                  : "bg-muted border-border border",
              )}
              aria-hidden="true"
            />
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="font-medium" data-testid="stash-row-name">
                  {itemName(item)}
                </p>
                {meta ? (
                  <p className="text-muted-foreground text-sm">{meta}</p>
                ) : null}
              </div>
              {!confirming ? (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={es.stash.edit}
                    data-testid="stash-edit"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={es.stash.deleteCta}
                    data-testid="stash-delete"
                    onClick={() => setConfirming(true)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </div>

            {item.colorway ? (
              <p className="text-sm" data-testid="stash-row-color">
                {item.colorway}
              </p>
            ) : null}

            <p
              className="text-sm tabular-nums"
              data-testid="stash-row-quantity"
            >
              {quantities.length > 0
                ? quantities.join(" · ")
                : es.stash.noQuantity}
            </p>

            <p
              className={cn(
                "text-sm",
                available.warn
                  ? "text-amber-600 dark:text-amber-500"
                  : "text-muted-foreground",
              )}
              data-testid="stash-row-available"
            >
              {available.text}
            </p>

            {item.location ? (
              <p
                className="text-muted-foreground text-sm"
                data-testid="stash-row-location"
              >
                {es.stash.locationShort.replace("{location}", item.location)}
              </p>
            ) : null}

            {item.notes ? (
              <p
                className="text-sm whitespace-pre-line"
                data-testid="stash-row-notes"
              >
                {item.notes}
              </p>
            ) : null}

            {confirming ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <p className="flex-1 text-sm">
                  {assigned
                    ? es.stash.deleteAssignedConfirm
                    : es.stash.deleteConfirm}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  data-testid="stash-delete-confirm"
                  onClick={remove}
                >
                  {es.stash.deleteYes}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => setConfirming(false)}
                >
                  {es.stash.deleteNo}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </li>
  );
}
