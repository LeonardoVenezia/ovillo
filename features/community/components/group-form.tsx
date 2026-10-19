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
import {
  GROUP_CATEGORIES,
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_RULES_MAX,
  JOIN_POLICIES,
} from "@/db/community-schema";
import {
  chipIdle,
  chipSelected,
  chipStyles,
} from "@/features/projects/components/chip-styles";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { createGroup, updateGroup } from "../actions";
import { groupFormSchema, type GroupFormValues } from "../schemas";

/**
 * Formulario de grupo (spec §5.9): crear y editar comparten campos. Solo el
 * nombre es obligatorio; la categoría y cómo se entra siempre tienen una
 * opción elegida.
 */
export function GroupForm({
  mode,
  groupId,
  slug,
  initial,
  cancelHref,
}: {
  mode: "create" | "edit";
  /** En edición: grupo a actualizar y su slug para volver a la ficha. */
  groupId?: string;
  slug?: string;
  initial: GroupFormValues;
  cancelHref: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: GroupFormValues) {
    setFormError(null);
    try {
      if (mode === "create") {
        const result = await createGroup(values);
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        toast.success(es.community.form.created);
        router.push(`/grupos/${result.slug}`);
        router.refresh();
        return;
      }

      const result = await updateGroup({ groupId: groupId!, values });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(es.community.form.edited);
      router.push(`/grupos/${slug}`);
      router.refresh();
    } catch {
      setFormError(es.community.errors.generic);
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
          <FieldLabel htmlFor="name">{es.community.form.nameLabel}</FieldLabel>
          <Input
            id="name"
            maxLength={GROUP_NAME_MAX}
            placeholder={es.community.form.namePlaceholder}
            aria-invalid={Boolean(errors.name)}
            data-testid="group-name-input"
            {...form.register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={errors.description ? true : undefined}>
          <FieldLabel htmlFor="description">
            {es.community.form.descriptionLabel}
          </FieldLabel>
          <Textarea
            id="description"
            rows={3}
            maxLength={GROUP_DESCRIPTION_MAX}
            placeholder={es.community.form.descriptionPlaceholder}
            aria-invalid={Boolean(errors.description)}
            data-testid="group-description-input"
            {...form.register("description")}
          />
          <FieldDescription>
            {es.community.form.descriptionHint}
          </FieldDescription>
          <FieldError errors={[errors.description]} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">
            {es.community.categoryFilterLabel}
          </FieldLegend>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {GROUP_CATEGORIES.map((value) => {
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
                      {es.community.categories[value]}
                    </button>
                  );
                })}
              </div>
            )}
          />
          <FieldError errors={[errors.category]} />
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">
            {es.community.joinPolicyLabel}
          </FieldLegend>
          <Controller
            control={form.control}
            name="joinPolicy"
            render={({ field }) => (
              <div className="grid gap-3 sm:grid-cols-2">
                {JOIN_POLICIES.map((value) => {
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
                        name="joinPolicy"
                        value={value}
                        checked={selected}
                        onChange={() => field.onChange(value)}
                        className="accent-primary mt-0.5 size-4"
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          {es.community.joinPolicies[value]}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {es.community.joinPolicyHints[value]}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          />
          <FieldDescription>
            {es.community.form.joinPolicyHint}
          </FieldDescription>
          <FieldError errors={[errors.joinPolicy]} />
        </FieldSet>

        <Field data-invalid={errors.rules ? true : undefined}>
          <FieldLabel htmlFor="rules">
            {es.community.form.rulesLabel}
          </FieldLabel>
          <Textarea
            id="rules"
            rows={4}
            maxLength={GROUP_RULES_MAX}
            placeholder={es.community.form.rulesPlaceholder}
            aria-invalid={Boolean(errors.rules)}
            data-testid="group-rules-input"
            {...form.register("rules")}
          />
          <FieldDescription>{es.community.form.rulesHint}</FieldDescription>
          <FieldError errors={[errors.rules]} />
        </Field>

        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            data-testid="group-submit"
          >
            {isSubmitting
              ? es.community.form.saving
              : mode === "create"
                ? es.community.form.submitCreate
                : es.community.form.submitEdit}
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <Link href={cancelHref}>{es.community.form.cancel}</Link>
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
