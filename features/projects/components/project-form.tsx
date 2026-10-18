"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { selectStyles } from "@/components/select-styles";
import { PROJECT_STATUSES } from "@/db/project-schema";
import { CRAFT_SLUGS, type Craft } from "@/features/profile/constants";
import type { PatternOption } from "@/features/pattern/queries";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { createProject, updateProject } from "../actions";
import {
  MADE_FOR_MAX,
  NAME_MAX,
  NOTES_MAX,
  PATTERN_MAX,
  projectFormSchema,
  SIZE_MAX,
  toProjectInput,
  type ProjectFormValues,
} from "../schemas";
import { chipIdle, chipSelected, chipStyles } from "./chip-styles";

/**
 * Formulario de proyecto (spec §5.3): crear y editar comparten campos.
 * Solo el nombre es obligatorio; el resto se completa ahora o después.
 */

function CraftPicker({
  value,
  onChange,
}: {
  value: Craft | "";
  onChange: (next: Craft | "") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={value === ""}
        className={cn(chipStyles, value === "" ? chipSelected : chipIdle)}
        onClick={() => onChange("")}
      >
        {es.projects.craftNone}
      </button>
      {CRAFT_SLUGS.map((slug) => {
        const selected = value === slug;
        return (
          <button
            key={slug}
            type="button"
            aria-pressed={selected}
            className={cn(chipStyles, selected ? chipSelected : chipIdle)}
            onClick={() => onChange(slug)}
          >
            {es.profile.craftLabels[slug]}
          </button>
        );
      })}
    </div>
  );
}

export function ProjectForm({
  mode,
  projectId,
  initial,
  patternOptions,
  cancelHref,
}: {
  mode: "create" | "edit";
  projectId?: string;
  initial: ProjectFormValues;
  /** Patrones de la biblioteca para vincular (spec §5.3). */
  patternOptions: PatternOption[];
  cancelHref: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: ProjectFormValues) {
    setFormError(null);
    try {
      const input = toProjectInput(values);
      const result =
        mode === "create"
          ? await createProject(input)
          : await updateProject(projectId!, input);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(
        mode === "create" ? es.projects.created : es.projects.saved,
      );
      router.push(`/mi-tejido/proyectos/${result.slug}`);
      router.refresh();
    } catch {
      setFormError(es.projects.errors.generic);
    }
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="name">{es.projects.nameLabel}</FieldLabel>
          <Input
            id="name"
            maxLength={NAME_MAX}
            placeholder={es.projects.namePlaceholder}
            aria-invalid={Boolean(errors.name)}
            {...form.register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">{es.projects.statusLabel}</FieldLegend>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {PROJECT_STATUSES.map((value) => {
                  const selected = field.value === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      className={cn(
                        chipStyles,
                        selected ? chipSelected : chipIdle,
                      )}
                      onClick={() => field.onChange(value)}
                    >
                      {es.projects.statusLabels[value]}
                    </button>
                  );
                })}
              </div>
            )}
          />
          <FieldDescription>{es.projects.statusHint}</FieldDescription>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">{es.projects.craftLabel}</FieldLegend>
          <Controller
            control={form.control}
            name="craft"
            render={({ field }) => (
              <CraftPicker value={field.value} onChange={field.onChange} />
            )}
          />
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="patternId">
            {es.projects.patternLibraryLabel}
          </FieldLabel>
          <select
            id="patternId"
            data-testid="project-pattern-select"
            className={selectStyles}
            {...form.register("patternId")}
          >
            <option value="">{es.projects.patternLibraryNone}</option>
            {patternOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.designerName
                  ? `${option.name} · ${option.designerName}`
                  : option.name}
              </option>
            ))}
          </select>
          <FieldDescription>{es.projects.patternLibraryHint}</FieldDescription>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={errors.progress ? true : undefined}>
            <FieldLabel htmlFor="progress">
              {es.projects.progressLabel}
            </FieldLabel>
            <Input
              id="progress"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              placeholder={es.projects.progressPlaceholder}
              aria-invalid={Boolean(errors.progress)}
              {...form.register("progress")}
            />
            <FieldDescription>{es.projects.progressHint}</FieldDescription>
            <FieldError errors={[errors.progress]} />
          </Field>

          <Field data-invalid={errors.startedAt ? true : undefined}>
            <FieldLabel htmlFor="startedAt">
              {es.projects.startedAtLabel}
            </FieldLabel>
            <Input
              id="startedAt"
              type="date"
              aria-invalid={Boolean(errors.startedAt)}
              {...form.register("startedAt")}
            />
            <FieldError errors={[errors.startedAt]} />
          </Field>

          <Field data-invalid={errors.patternText ? true : undefined}>
            <FieldLabel htmlFor="patternText">
              {es.projects.patternTextLabel}
            </FieldLabel>
            <Input
              id="patternText"
              maxLength={PATTERN_MAX}
              placeholder={es.projects.patternPlaceholder}
              aria-invalid={Boolean(errors.patternText)}
              {...form.register("patternText")}
            />
            <FieldError errors={[errors.patternText]} />
          </Field>

          <Field data-invalid={errors.size ? true : undefined}>
            <FieldLabel htmlFor="size">{es.projects.sizeLabel}</FieldLabel>
            <Input
              id="size"
              maxLength={SIZE_MAX}
              placeholder={es.projects.sizePlaceholder}
              aria-invalid={Boolean(errors.size)}
              {...form.register("size")}
            />
            <FieldError errors={[errors.size]} />
          </Field>

          <Field data-invalid={errors.madeFor ? true : undefined}>
            <FieldLabel htmlFor="madeFor">
              {es.projects.madeForLabel}
            </FieldLabel>
            <Input
              id="madeFor"
              maxLength={MADE_FOR_MAX}
              placeholder={es.projects.madeForPlaceholder}
              aria-invalid={Boolean(errors.madeFor)}
              {...form.register("madeFor")}
            />
            <FieldError errors={[errors.madeFor]} />
          </Field>

          <Field data-invalid={errors.tagsText ? true : undefined}>
            <FieldLabel htmlFor="tags">{es.projects.tagsLabel}</FieldLabel>
            <Input
              id="tags"
              placeholder={es.projects.tagsPlaceholder}
              aria-invalid={Boolean(errors.tagsText)}
              {...form.register("tagsText")}
            />
            <FieldDescription>{es.projects.tagsHint}</FieldDescription>
            <FieldError errors={[errors.tagsText]} />
          </Field>
        </div>

        <Field data-invalid={errors.notes ? true : undefined}>
          <FieldLabel htmlFor="notes">{es.projects.notesLabel}</FieldLabel>
          <Textarea
            id="notes"
            rows={5}
            maxLength={NOTES_MAX}
            placeholder={es.projects.notesPlaceholder}
            aria-invalid={Boolean(errors.notes)}
            {...form.register("notes")}
          />
          <FieldError errors={[errors.notes]} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">
            {es.projects.visibilityLabel}
          </FieldLegend>
          <Controller
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <div className="grid gap-3 sm:grid-cols-2">
                {(["publico", "privado"] as const).map((value) => {
                  const selected = field.value === value;
                  return (
                    <label
                      key={value}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={value}
                        checked={selected}
                        onChange={() => field.onChange(value)}
                        className="accent-primary mt-0.5 size-4"
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          {value === "publico"
                            ? es.projects.visibilityPublic
                            : es.projects.visibilityPrivate}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {value === "publico"
                            ? es.projects.visibilityPublicBody
                            : es.projects.visibilityPrivateBody}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          />
        </FieldSet>

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting
              ? mode === "create"
                ? es.projects.creating
                : es.projects.saving
              : mode === "create"
                ? es.projects.create
                : es.projects.save}
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href={cancelHref}>{es.projects.cancel}</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
