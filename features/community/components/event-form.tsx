"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EVENT_CRAFTS,
  EVENT_NAME_MAX,
  EVENT_PATTERNS_MAX,
  EVENT_STAGE_NOTE_MAX,
  EVENT_STAGE_TITLE_MAX,
  EVENT_STAGES_MAX,
  THREAD_BODY_MAX,
  type EventCraft,
} from "@/db/community-schema";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import { cn } from "@/lib/utils";
import { normalizeText } from "@/lib/slug";
import { es } from "@/messages/es";

import type { EventPatternView } from "../event-queries";
import { createEvent, updateEvent } from "../event-actions";
import { eventCraftLabel } from "../format";
import type { EventFormValues } from "../schemas";

/**
 * Formulario de KAL/CAL (spec §5.10): nombre, técnica, fechas, patrones de
 * la biblioteca (hasta 4, con filtro) y etapas opcionales. Al crear, el
 * servidor abre también el hilo del evento (D-056).
 */
export function EventForm({
  mode,
  groupId,
  slug,
  eventId,
  initial,
  patterns,
  cancelHref,
}: {
  mode: "create" | "edit";
  groupId: string;
  slug: string;
  eventId?: string;
  initial: EventFormValues;
  patterns: EventPatternView[];
  cancelHref: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [craft, setCraft] = useState<EventCraft>(initial.craft);
  const [startsAt, setStartsAt] = useState(initial.startsAt);
  const [endsAt, setEndsAt] = useState(initial.endsAt);
  const [description, setDescription] = useState(initial.description);
  const [patternIds, setPatternIds] = useState<string[]>(initial.patternIds);
  const [patternFilter, setPatternFilter] = useState("");
  const [stages, setStages] = useState(initial.stages);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const filter = normalizeText(patternFilter);
  const visiblePatterns =
    filter.length === 0
      ? patterns
      : patterns.filter((pattern) =>
          normalizeText(pattern.name).includes(filter),
        );

  function togglePattern(id: string) {
    setPatternIds((value) => {
      if (value.includes(id)) {
        return value.filter((item) => item !== id);
      }
      if (value.length >= EVENT_PATTERNS_MAX) {
        toast.error(es.community.events.form.patternsMax);
        return value;
      }
      return [...value, id];
    });
  }

  function addStage() {
    if (stages.length >= EVENT_STAGES_MAX) {
      return;
    }
    setStages((value) => [...value, { title: "", note: "" }]);
  }

  function replaceStage(
    index: number,
    patch: Partial<EventFormValues["stages"][number]>,
  ) {
    setStages((value) =>
      value.map((stage, position) =>
        position === index ? { ...stage, ...patch } : stage,
      ),
    );
  }

  function removeStage(index: number) {
    setStages((value) => value.filter((_, position) => position !== index));
  }

  async function submit() {
    if (name.trim().length === 0) {
      toast.error(es.community.events.errors.nameRequired);
      return;
    }
    if (startsAt === "") {
      toast.error(es.community.events.errors.startRequired);
      return;
    }
    if (endsAt === "") {
      toast.error(es.community.events.errors.endRequired);
      return;
    }
    if (endsAt < startsAt) {
      toast.error(es.community.events.errors.dateOrder);
      return;
    }
    const cleanedStages = stages.map((stage) => ({
      title: stage.title.trim(),
      note: stage.note.trim(),
    }));
    if (cleanedStages.some((stage) => stage.title.length === 0)) {
      toast.error(es.community.events.errors.stageTitleRequired);
      return;
    }

    const values: EventFormValues = {
      name: name.trim(),
      craft,
      startsAt,
      endsAt,
      description: description.trim(),
      patternIds,
      stages: cleanedStages,
    };

    setBusy(true);
    try {
      setStatus(es.community.events.form.saving);
      if (mode === "create") {
        const result = await createEvent({ groupId, values });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(es.community.events.form.created);
        router.push(`/grupos/${slug}/eventos/${result.id}`);
        return;
      }

      const result = await updateEvent({ eventId: eventId ?? "", values });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.community.events.form.edited);
      router.push(`/grupos/${slug}/eventos/${eventId}`);
      router.refresh();
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className="flex flex-col gap-6"
      data-testid="event-form"
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="event-name">
            {es.community.events.form.nameLabel}
          </FieldLabel>
          <Input
            id="event-name"
            maxLength={EVENT_NAME_MAX}
            placeholder={es.community.events.form.namePlaceholder}
            value={name}
            data-testid="event-name-input"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">
            {es.community.events.form.craftLabel}
          </FieldLegend>
          <div className="flex flex-wrap gap-2">
            {EVENT_CRAFTS.map((value) => {
              const selected = value === craft;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  data-testid={`event-craft-${value}`}
                  className={cn(chipStyles, selected ? chipSelected : chipIdle)}
                  onClick={() => setCraft(value)}
                >
                  {eventCraftLabel(value)} ·{" "}
                  {es.community.events.craftNames[value]}
                </button>
              );
            })}
          </div>
        </FieldSet>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="event-start">
              {es.community.events.form.startsLabel}
            </FieldLabel>
            <Input
              id="event-start"
              type="date"
              value={startsAt}
              data-testid="event-start-input"
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="event-end">
              {es.community.events.form.endsLabel}
            </FieldLabel>
            <Input
              id="event-end"
              type="date"
              value={endsAt}
              data-testid="event-end-input"
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="event-description">
            {es.community.events.form.descriptionLabel}
          </FieldLabel>
          <Textarea
            id="event-description"
            rows={5}
            maxLength={THREAD_BODY_MAX}
            placeholder={es.community.events.form.descriptionPlaceholder}
            value={description}
            data-testid="event-description-input"
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">
            {es.community.events.form.patternsLabel}
          </FieldLegend>
          <Input
            aria-label={es.community.events.form.patternsFilterLabel}
            placeholder={es.community.events.form.patternsFilterPlaceholder}
            value={patternFilter}
            data-testid="event-pattern-filter"
            onChange={(event) => setPatternFilter(event.target.value)}
          />
          {visiblePatterns.length > 0 ? (
            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
              {visiblePatterns.map((pattern) => {
                const checked = patternIds.includes(pattern.id);
                return (
                  <li key={pattern.id}>
                    <label className="border-border bg-card hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-xl border p-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => togglePattern(pattern.id)}
                        data-testid={`event-pattern-${pattern.slug}`}
                      />
                      <span className="text-sm">{pattern.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              {es.community.events.form.patternsEmpty}
            </p>
          )}
          <FieldDescription>
            {es.community.events.form.patternsHint}
          </FieldDescription>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">
            {es.community.events.form.stagesLabel}
          </FieldLegend>
          <FieldDescription>
            {es.community.events.form.stagesHint}
          </FieldDescription>
          {stages.length > 0 ? (
            <ol className="flex flex-col gap-3" data-testid="event-stages">
              {stages.map((stage, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span
                    className="text-muted-foreground mt-2 text-sm"
                    aria-hidden
                  >
                    {index + 1}.
                  </span>
                  <span className="flex flex-1 flex-col gap-2">
                    <Input
                      maxLength={EVENT_STAGE_TITLE_MAX}
                      aria-label={
                        es.community.events.form.stageTitlePlaceholder
                      }
                      placeholder={
                        es.community.events.form.stageTitlePlaceholder
                      }
                      value={stage.title}
                      data-testid="event-stage-title"
                      onChange={(event) =>
                        replaceStage(index, { title: event.target.value })
                      }
                    />
                    <Input
                      maxLength={EVENT_STAGE_NOTE_MAX}
                      aria-label={es.community.events.form.stageNotePlaceholder}
                      placeholder={
                        es.community.events.form.stageNotePlaceholder
                      }
                      value={stage.note}
                      data-testid="event-stage-note"
                      onChange={(event) =>
                        replaceStage(index, { note: event.target.value })
                      }
                    />
                  </span>
                  <button
                    type="button"
                    aria-label={es.community.events.form.stageRemove}
                    data-testid="event-stage-remove"
                    onClick={() => removeStage(index)}
                    className="border-border mt-1 flex size-8 items-center justify-center rounded-lg border"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            disabled={busy || stages.length >= EVENT_STAGES_MAX}
            data-testid="event-stage-add"
            onClick={addStage}
          >
            <Plus aria-hidden="true" />
            {es.community.events.form.stageAdd}
          </Button>
        </FieldSet>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={busy}
            data-testid="event-submit"
          >
            {busy
              ? es.community.events.form.saving
              : mode === "create"
                ? es.community.events.form.submitCreate
                : es.community.events.form.submitEdit}
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href={cancelHref}>{es.community.events.form.cancel}</Link>
          </Button>
          {status ? (
            <span role="status" className="text-muted-foreground text-sm">
              {status}
            </span>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
