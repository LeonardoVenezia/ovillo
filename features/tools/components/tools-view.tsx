"use client";

import { Pencil, Plus, Ruler, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TOOL_KINDS,
  TOOL_MATERIALS,
  type ToolKind,
  type ToolMaterial,
} from "@/db/tool-schema";
import { chipIdle, chipSelected, chipStyles } from "@/features/projects/components/chip-styles";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { createTool, deleteTool, updateTool } from "../actions";
import {
  parseSizeMmInput,
  TOOL_LENGTH_CM_MAX,
  TOOL_LENGTH_CM_MIN,
  TOOL_NOTES_MAX,
  TOOL_QUANTITY_MAX,
  TOOL_QUANTITY_MIN,
  TOOLS_PER_USER_MAX,
} from "../schemas";
import { equivalenceLabel, formatMm } from "../sizes";

/**
 * Inventario de herramientas (spec §5.7): grilla de agujas y ganchos con
 * equivalencias US/UK, filtro por tipo y alta/edición/borrado en línea.
 * Solo las ve su dueña.
 */

export type ToolItem = {
  id: string;
  kind: ToolKind;
  sizeMm: number;
  material: ToolMaterial | null;
  lengthCm: number | null;
  quantity: number;
  notes: string | null;
};

type Filter = ToolKind | "todas";

export function ToolsView({ tools }: { tools: ToolItem[] }) {
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>("todas");

  const visible =
    filter === "todas"
      ? tools
      : tools.filter((item) => item.kind === filter);
  const atLimit = tools.length >= TOOLS_PER_USER_MAX;

  return (
    <section className="flex flex-col gap-4" data-testid="tools-view">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={es.tools.kindLabel}
        >
          <FilterChip
            label={es.tools.filterAll}
            active={filter === "todas"}
            testId="tool-filter-todas"
            onClick={() => setFilter("todas")}
          />
          {TOOL_KINDS.map((kind) => (
            <FilterChip
              key={kind}
              label={es.tools.kinds[kind]}
              active={filter === kind}
              testId={`tool-filter-${kind}`}
              onClick={() => setFilter(kind)}
            />
          ))}
        </div>
        {!creating && !atLimit ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setCreating(true)}
            data-testid="tool-new-cta"
          >
            <Plus aria-hidden="true" />
            {es.tools.newCta}
          </Button>
        ) : null}
      </div>

      {creating ? (
        <ToolForm onDone={() => setCreating(false)} />
      ) : null}

      {tools.length === 0 && !creating ? (
        <EmptyState
          icon={Ruler}
          title={es.tools.emptyTitle}
          body={es.tools.emptyBody}
          action={
            <Button
              size="lg"
              type="button"
              onClick={() => setCreating(true)}
              data-testid="tool-first-cta"
            >
              {es.tools.firstCta}
            </Button>
          }
        />
      ) : null}

      {tools.length > 0 && visible.length === 0 ? (
        <p className="text-muted-foreground text-sm" data-testid="tool-filter-empty">
          {es.tools.filterEmpty}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="tool-grid">
          {visible.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </ul>
      ) : null}

      {tools.length > 0 ? (
        <p className="text-muted-foreground text-xs">{es.tools.listHint}</p>
      ) : null}
    </section>
  );
}

function FilterChip({
  label,
  active,
  testId,
  onClick,
}: {
  label: string;
  active: boolean;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-testid={testId}
      className={cn(chipStyles, active ? chipSelected : chipIdle)}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ToolCard({ tool }: { tool: ToolItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const equivalence = equivalenceLabel(tool.kind, tool.sizeMm);
  const meta = [
    es.tools.kinds[tool.kind],
    tool.material ? es.tools.materials[tool.material] : null,
    tool.lengthCm !== null
      ? es.tools.cableShort.replace("{cm}", String(tool.lengthCm))
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

  function remove() {
    startTransition(async () => {
      const result = await deleteTool(tool.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.tools.deleted);
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <li
      className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4"
      data-testid="tool-row"
      data-size={formatMm(tool.sizeMm)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p
            className="font-heading text-2xl font-semibold tabular-nums"
            data-testid="tool-row-size"
          >
            {formatMm(tool.sizeMm)}{" "}
            <span className="text-muted-foreground text-sm font-normal">
              {es.tools.sizeSuffix}
            </span>
          </p>
          {equivalence ? (
            <p
              className="text-muted-foreground text-sm"
              data-testid="tool-row-equivalence"
            >
              {equivalence}
            </p>
          ) : null}
          <p className="text-muted-foreground text-sm">{meta}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {tool.quantity > 1 ? (
            <Badge variant="secondary" data-testid="tool-row-quantity">
              <span className="sr-only">{es.tools.quantityLabel}</span>×
              {tool.quantity}
            </Badge>
          ) : null}
          {!editing && !confirming ? (
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={es.tools.edit}
                data-testid="tool-edit"
                onClick={() => setEditing(true)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={es.tools.deleteCta}
                data-testid="tool-delete"
                onClick={() => setConfirming(true)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {editing ? (
        <ToolForm tool={tool} onDone={() => setEditing(false)} />
      ) : null}

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 text-sm">{es.tools.deleteConfirm}</p>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isPending}
            data-testid="tool-delete-confirm"
            onClick={remove}
          >
            {es.tools.deleteYes}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setConfirming(false)}
          >
            {es.tools.deleteNo}
          </Button>
        </div>
      ) : null}

      {!editing && tool.notes ? (
        <p className="text-sm whitespace-pre-line" data-testid="tool-row-notes">
          {tool.notes}
        </p>
      ) : null}
    </li>
  );
}

/** Alta y edición comparten formulario: al editar llega la herramienta. */
function ToolForm({ tool, onDone }: { tool?: ToolItem; onDone: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<ToolKind>(tool?.kind ?? "rectas");
  const [size, setSize] = useState(tool ? formatMm(tool.sizeMm) : "");
  const [material, setMaterial] = useState<ToolMaterial | "">(
    tool?.material ?? "",
  );
  const [cable, setCable] = useState(
    tool?.lengthCm === null || tool?.lengthCm === undefined
      ? ""
      : String(tool.lengthCm),
  );
  const [quantity, setQuantity] = useState(String(tool?.quantity ?? 1));
  const [notes, setNotes] = useState(tool?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const parsedSize = parseSizeMmInput(size);
  const preview =
    typeof parsedSize === "number"
      ? equivalenceLabel(kind, parsedSize)
      : null;

  async function submit() {
    if (parsedSize === null || parsedSize === "invalid") {
      toast.error(
        parsedSize === null
          ? es.tools.errors.sizeRequired
          : es.tools.errors.sizeStep,
      );
      return;
    }

    const cableNumber = cable.trim() === "" ? null : Number(cable);
    const quantityNumber = Number(quantity.trim() === "" ? "1" : quantity);
    if (
      cableNumber !== null &&
      (!Number.isInteger(cableNumber) ||
        cableNumber < TOOL_LENGTH_CM_MIN ||
        cableNumber > TOOL_LENGTH_CM_MAX)
    ) {
      toast.error(es.tools.errors.cableRange);
      return;
    }
    if (
      !Number.isInteger(quantityNumber) ||
      quantityNumber < TOOL_QUANTITY_MIN ||
      quantityNumber > TOOL_QUANTITY_MAX
    ) {
      toast.error(es.tools.errors.quantityRange);
      return;
    }

    const input = {
      kind,
      sizeMm: parsedSize,
      material: material === "" ? null : material,
      lengthCm: cableNumber,
      quantity: quantityNumber,
      notes: notes.trim() === "" ? null : notes.trim(),
    };

    setBusy(true);
    try {
      const result = tool
        ? await updateTool({ id: tool.id, ...input })
        : await createTool(input);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tool ? es.tools.saved : es.tools.created);
      onDone();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const idPrefix = tool ? `tool-edit-${tool.id}` : "tool-new";

  return (
    <div
      className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4"
      data-testid={tool ? "tool-edit-form" : "tool-new-form"}
    >
      <p className="font-medium">
        {tool ? es.tools.editTitle : es.tools.newTitle}
      </p>

      <div className="flex flex-col gap-2">
        <Label id={`${idPrefix}-kind-label`}>{es.tools.kindLabel}</Label>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby={`${idPrefix}-kind-label`}
        >
          {TOOL_KINDS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              data-testid={`tool-kind-${value}`}
              className={cn(chipStyles, kind === value ? chipSelected : chipIdle)}
              onClick={() => setKind(value)}
            >
              {es.tools.kinds[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-size`}>
          {es.tools.sizeLabel}
          <span className="text-muted-foreground font-normal">
            {" "}
            ({es.tools.sizeSuffix})
          </span>
        </Label>
        <Input
          id={`${idPrefix}-size`}
          data-testid="tool-size"
          inputMode="decimal"
          value={size}
          placeholder={es.tools.sizePlaceholder}
          onChange={(event) => setSize(event.target.value)}
          className="w-32"
        />
        {preview ? (
          <p
            className="text-muted-foreground text-xs"
            data-testid="tool-size-equivalence"
          >
            {preview}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">{es.tools.sizeHint}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label id={`${idPrefix}-material-label`}>{es.tools.materialLabel}</Label>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby={`${idPrefix}-material-label`}
        >
          <button
            type="button"
            aria-pressed={material === ""}
            data-testid="tool-material-none"
            className={cn(chipStyles, material === "" ? chipSelected : chipIdle)}
            onClick={() => setMaterial("")}
          >
            {es.tools.materialNone}
          </button>
          {TOOL_MATERIALS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={material === value}
              data-testid={`tool-material-${value}`}
              className={cn(
                chipStyles,
                material === value ? chipSelected : chipIdle,
              )}
              onClick={() => setMaterial(value)}
            >
              {es.tools.materials[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "circulares" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-cable`}>
              {es.tools.cableLabel}
              <span className="text-muted-foreground font-normal">
                {" "}
                ({es.tools.cableSuffix})
              </span>
            </Label>
            <Input
              id={`${idPrefix}-cable`}
              data-testid="tool-cable"
              type="number"
              inputMode="numeric"
              min={TOOL_LENGTH_CM_MIN}
              max={TOOL_LENGTH_CM_MAX}
              step={5}
              value={cable}
              onChange={(event) => setCable(event.target.value)}
              className="w-32"
            />
            <p className="text-muted-foreground text-xs">{es.tools.cableHint}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-quantity`}>
            {es.tools.quantityLabel}
          </Label>
          <Input
            id={`${idPrefix}-quantity`}
            data-testid="tool-quantity"
            type="number"
            inputMode="numeric"
            min={TOOL_QUANTITY_MIN}
            max={TOOL_QUANTITY_MAX}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-32"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-notes`}>{es.tools.notesLabel}</Label>
        <Textarea
          id={`${idPrefix}-notes`}
          data-testid="tool-notes"
          rows={2}
          maxLength={TOOL_NOTES_MAX}
          placeholder={es.tools.notesPlaceholder}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={submit}
          data-testid="tool-save"
        >
          {busy ? es.tools.saving : tool ? es.tools.save : es.tools.create}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={busy}
          onClick={onDone}
        >
          {es.tools.cancel}
        </Button>
      </div>
    </div>
  );
}
