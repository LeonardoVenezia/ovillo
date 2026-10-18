"use client";

import { Maximize2, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { es } from "@/messages/es";

import { createCounter, deleteCounter, updateCounter } from "../actions";
import {
  COUNTER_NAME_MAX,
  COUNTER_REPEAT_MAX,
  COUNTER_REPEAT_MIN,
  COUNTERS_PER_PROJECT_MAX,
} from "../schemas";
import {
  clearCounterStorage,
  type CounterSyncStatus,
  useCounterSync,
} from "./use-counter-sync";

/**
 * Sección "Contadores" de la página del proyecto (spec §5.4): hasta 10 por
 * proyecto, con conteo rápido (+1 / −1), edición, borrado con confirmación y
 * el enlace a la pantalla completa. El conteo es local-first (D-035).
 */

export type CounterListItem = {
  id: string;
  name: string;
  count: number;
  version: number;
  repeatEvery: number | null;
};

export function ProjectCounters({
  projectId,
  counters,
}: {
  projectId: string;
  counters: CounterListItem[];
}) {
  const [creating, setCreating] = useState(false);

  return (
    <section className="flex flex-col gap-3" data-testid="project-counters">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">
          {es.counters.title}
        </h2>
        {!creating && counters.length < COUNTERS_PER_PROJECT_MAX ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCreating(true)}
            data-testid="counter-new-cta"
          >
            <Plus aria-hidden="true" />
            {es.counters.newCta}
          </Button>
        ) : null}
      </div>

      {counters.length === 0 && !creating ? (
        <div>
          <p className="font-medium">{es.counters.emptyTitle}</p>
          <p className="text-muted-foreground text-sm">
            {es.counters.emptyBody}
          </p>
        </div>
      ) : null}

      {creating ? (
        <CounterForm projectId={projectId} onDone={() => setCreating(false)} />
      ) : null}

      {counters.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {counters.map((counter) => (
            <CounterRow key={counter.id} counter={counter} />
          ))}
        </ul>
      ) : null}

      {counters.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {es.counters.sectionHint}
        </p>
      ) : null}
    </section>
  );
}

/** Formulario de alta: nombre y recordatorio opcional. */
function CounterForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const repeatEvery = parseRepeat(repeat);
    if (repeatEvery === "invalid") {
      toast.error(es.counters.errors.repeatRange);
      return;
    }

    setBusy(true);
    try {
      const result = await createCounter({
        projectId,
        name: name.trim(),
        repeatEvery,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.counters.created);
      onDone();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4">
      <p className="font-medium">{es.counters.newTitle}</p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="counter-new-name">{es.counters.nameLabel}</Label>
        <Input
          id="counter-new-name"
          data-testid="counter-new-name"
          value={name}
          maxLength={COUNTER_NAME_MAX}
          placeholder={es.counters.namePlaceholder}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="counter-new-repeat">
          {es.counters.repeatLabel}
          <span className="text-muted-foreground font-normal">
            {" "}
            {es.counters.repeatSuffix}
          </span>
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="counter-new-repeat"
            data-testid="counter-new-repeat"
            type="number"
            inputMode="numeric"
            min={COUNTER_REPEAT_MIN}
            max={COUNTER_REPEAT_MAX}
            value={repeat}
            placeholder={es.counters.repeatNever}
            onChange={(event) => setRepeat(event.target.value)}
            className="w-28"
          />
          <span className="text-muted-foreground text-xs">
            {es.counters.repeatHint}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={submit}
          data-testid="counter-create"
        >
          {busy ? es.counters.creating : es.counters.create}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={busy}
          onClick={onDone}
        >
          {es.counters.cancel}
        </Button>
      </div>
    </div>
  );
}

function CounterRow({ counter }: { counter: CounterListItem }) {
  const router = useRouter();
  const { count, status, conflict, dismissConflict, press, subtract } =
    useCounterSync({
      counterId: counter.id,
      initialCount: counter.count,
      initialVersion: counter.version,
    });

  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteCounter(counter.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      clearCounterStorage(counter.id);
      toast.success(es.counters.deleted);
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <li
      className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4"
      data-testid="counter-row"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{counter.name}</p>
          {counter.repeatEvery !== null ? (
            <p className="text-muted-foreground text-xs">
              {es.counters.repeatLabel} {counter.repeatEvery}{" "}
              {es.counters.repeatSuffix}
            </p>
          ) : null}
        </div>
        {!editing && !confirming ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={es.counters.edit}
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={es.counters.deleteCta}
              onClick={() => setConfirming(true)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <CounterEditForm counter={counter} onDone={() => setEditing(false)} />
      ) : null}

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 text-sm">{es.counters.deleteConfirm}</p>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={remove}
          >
            {es.counters.deleteYes}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => setConfirming(false)}
          >
            {es.counters.deleteNo}
          </Button>
        </div>
      ) : null}

      {!editing && !confirming ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-3xl font-semibold tabular-nums">
              <span data-testid="counter-row-value">{count}</span>{" "}
              <span className="text-muted-foreground text-sm font-normal">
                {count === 1 ? es.counters.countOne : es.counters.countUnit}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="size-11 px-0"
                aria-label={es.counters.subtract}
                onClick={subtract}
                data-testid="counter-row-subtract"
              >
                <Minus aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="size-11 px-0"
                aria-label={es.counters.add}
                onClick={press}
                data-testid="counter-row-add"
              >
                <Plus aria-hidden="true" />
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                asChild
                data-testid="counter-row-open"
              >
                <Link href={`/contador/${counter.id}`}>
                  <Maximize2 aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {es.counters.openFull}
                  </span>
                  <span className="sr-only sm:hidden">
                    {es.counters.openFull}
                  </span>
                </Link>
              </Button>
            </div>
          </div>

          {status !== "synced" && !conflict ? (
            <p className="text-muted-foreground text-xs" role="status">
              {statusLabel(status)}
            </p>
          ) : null}

          {conflict ? (
            <div className="flex flex-wrap items-center gap-2" role="status">
              <p className="text-muted-foreground flex-1 text-xs">
                {es.counters.syncConflict.replace("{count}", String(count))}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={dismissConflict}
              >
                {es.counters.conflictDismiss}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

function CounterEditForm({
  counter,
  onDone,
}: {
  counter: CounterListItem;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(counter.name);
  const [repeat, setRepeat] = useState(
    counter.repeatEvery === null ? "" : String(counter.repeatEvery),
  );
  const [busy, setBusy] = useState(false);

  async function submit() {
    const repeatEvery = parseRepeat(repeat);
    if (repeatEvery === "invalid") {
      toast.error(es.counters.errors.repeatRange);
      return;
    }

    setBusy(true);
    try {
      const result = await updateCounter({
        id: counter.id,
        name: name.trim(),
        repeatEvery,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.counters.saved);
      onDone();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`counter-name-${counter.id}`}>
          {es.counters.nameLabel}
        </Label>
        <Input
          id={`counter-name-${counter.id}`}
          value={name}
          maxLength={COUNTER_NAME_MAX}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`counter-repeat-${counter.id}`}>
          {es.counters.repeatLabel}
        </Label>
        <Input
          id={`counter-repeat-${counter.id}`}
          type="number"
          inputMode="numeric"
          min={COUNTER_REPEAT_MIN}
          max={COUNTER_REPEAT_MAX}
          value={repeat}
          placeholder={es.counters.repeatNever}
          onChange={(event) => setRepeat(event.target.value)}
          className="w-28"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={submit}>
          {busy ? es.counters.saving : es.counters.save}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={onDone}
        >
          {es.counters.cancel}
        </Button>
      </div>
    </div>
  );
}

/** "6" → 6; "" → null; cualquier otra cosa → "invalid". */
function parseRepeat(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  if (
    !Number.isInteger(parsed) ||
    parsed < COUNTER_REPEAT_MIN ||
    parsed > COUNTER_REPEAT_MAX
  ) {
    return "invalid";
  }
  return parsed;
}

function statusLabel(status: CounterSyncStatus): string {
  return status === "saving"
    ? es.counters.syncSaving
    : status === "conflict"
      ? es.counters.syncConflictShort
      : es.counters.syncPending;
}
