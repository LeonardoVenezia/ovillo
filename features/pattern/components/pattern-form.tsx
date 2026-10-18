"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PATTERN_CATEGORIES, PATTERN_LANGUAGES } from "@/db/pattern-schema";
import { YARN_WEIGHTS } from "@/db/yarn-schema";
import { CRAFT_SLUGS } from "@/features/profile/constants";
import { weightLabel } from "@/features/yarn/format";
import { es } from "@/messages/es";

import { createPattern, updatePattern } from "../actions";
import {
  categoryLabel,
  craftLabel,
  difficultyLabel,
  languageLabel,
} from "../format";
import {
  DESIGNER_NAME_MAX,
  PATTERN_NAME_MAX,
  SIZES_MAX,
  SOURCE_URL_MAX,
  TEXT_MAX,
  parsePatternForm,
  type PatternFieldErrors,
  type PatternFormState,
} from "../schemas";
import { selectStyles } from "@/components/select-styles";

/**
 * Formulario de propuesta y edición de un patrón (spec §5.5).
 *
 * Todo patrón se enlaza a donde está publicado: `source_url` es obligatorio.
 * Los campos finos (metraje, agujas, galga, tallas) son opcionales: mejor un
 * patrón con pocos datos verificados que con datos inventados.
 */

export type PatternFormInitial = PatternFormState;

const DIFFICULTIES = [1, 2, 3, 4, 5] as const;

export function PatternForm({
  mode,
  initial,
  patternId,
  cancelHref,
}: {
  mode: "create" | "edit";
  initial: PatternFormInitial;
  /** Solo en modo edición. */
  patternId?: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<PatternFormState>(initial);
  const [errors, setErrors] = useState<PatternFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof PatternFormState>(
    key: K,
    value: PatternFormState[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = parsePatternForm(state);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      try {
        const saved =
          mode === "create"
            ? await createPattern(result.input)
            : await updatePattern({ ...result.input, id: patternId ?? "" });
        if (!saved.ok) {
          setFormError(saved.error);
          return;
        }
        toast.success(
          mode === "create" ? es.patterns.form.created : es.patterns.form.saved,
        );
        router.push(`/patrones/${saved.slug}`);
        router.refresh();
      } catch {
        setFormError(es.patterns.errors.generic);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      data-testid="pattern-form"
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="name">{es.patterns.form.nameLabel}</FieldLabel>
          <Input
            id="name"
            value={state.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder={es.patterns.form.namePlaceholder}
            maxLength={PATTERN_NAME_MAX}
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        <Field data-invalid={errors.designer ? true : undefined}>
          <FieldLabel htmlFor="designer">
            {es.patterns.form.designerLabel}
          </FieldLabel>
          <Input
            id="designer"
            value={state.designerName}
            onChange={(event) => update("designerName", event.target.value)}
            placeholder={es.patterns.form.designerPlaceholder}
            maxLength={DESIGNER_NAME_MAX}
            autoComplete="off"
            aria-invalid={Boolean(errors.designer)}
          />
          <FieldDescription>{es.patterns.form.designerHint}</FieldDescription>
          <FieldError>{errors.designer}</FieldError>
        </Field>

        <Field data-invalid={errors.source ? true : undefined}>
          <FieldLabel htmlFor="source">
            {es.patterns.form.sourceLabel}
          </FieldLabel>
          <Input
            id="source"
            type="url"
            inputMode="url"
            value={state.sourceUrl}
            onChange={(event) => update("sourceUrl", event.target.value)}
            placeholder={es.patterns.form.sourcePlaceholder}
            maxLength={SOURCE_URL_MAX}
            autoComplete="off"
            aria-invalid={Boolean(errors.source)}
          />
          <FieldDescription>{es.patterns.form.sourceHint}</FieldDescription>
          <FieldError>{errors.source}</FieldError>
        </Field>

        <Field data-invalid={errors.craft ? true : undefined}>
          <FieldLabel htmlFor="craft">{es.patterns.form.craftLabel}</FieldLabel>
          <select
            id="craft"
            value={state.craft}
            onChange={(event) => update("craft", event.target.value)}
            className={selectStyles}
          >
            <option value="">{es.patterns.form.craftPlaceholder}</option>
            {CRAFT_SLUGS.map((craft) => (
              <option key={craft} value={craft}>
                {craftLabel(craft)}
              </option>
            ))}
          </select>
          <FieldError>{errors.craft}</FieldError>
        </Field>

        <Field data-invalid={errors.category ? true : undefined}>
          <FieldLabel htmlFor="category">
            {es.patterns.form.categoryLabel}
          </FieldLabel>
          <select
            id="category"
            value={state.category}
            onChange={(event) => update("category", event.target.value)}
            className={selectStyles}
          >
            <option value="">{es.patterns.form.categoryPlaceholder}</option>
            {PATTERN_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
          <FieldError>{errors.category}</FieldError>
        </Field>

        <Field
          data-invalid={errors.difficulty || errors.weight ? true : undefined}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="difficulty">
                {es.patterns.form.difficultyLabel}
              </Label>
              <select
                id="difficulty"
                value={state.difficulty}
                onChange={(event) => update("difficulty", event.target.value)}
                className={selectStyles}
              >
                <option value="">
                  {es.patterns.form.difficultyPlaceholder}
                </option>
                {DIFFICULTIES.map((value) => (
                  <option key={value} value={String(value)}>
                    {difficultyLabel(value)}
                  </option>
                ))}
              </select>
              <FieldError>{errors.difficulty}</FieldError>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="weight">{es.patterns.form.weightLabel}</Label>
              <select
                id="weight"
                value={state.weight}
                onChange={(event) => update("weight", event.target.value)}
                className={selectStyles}
              >
                <option value="">{es.patterns.form.weightPlaceholder}</option>
                {YARN_WEIGHTS.map((weight) => (
                  <option key={weight} value={weight}>
                    {weightLabel(weight)}
                  </option>
                ))}
              </select>
              <FieldError>{errors.weight}</FieldError>
            </div>
          </div>
        </Field>

        <Field data-invalid={errors.yardage ? true : undefined}>
          <FieldLabel htmlFor="yardage-min">
            {es.patterns.form.yardageLabel}
          </FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="yardage-min"
                className="text-muted-foreground text-sm font-normal"
              >
                {es.patterns.form.yardageFrom}
              </Label>
              <Input
                id="yardage-min"
                value={state.yardageMinText}
                onChange={(event) =>
                  update("yardageMinText", event.target.value)
                }
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
                aria-invalid={Boolean(errors.yardage)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="yardage-max"
                className="text-muted-foreground text-sm font-normal"
              >
                {es.patterns.form.yardageTo}
              </Label>
              <Input
                id="yardage-max"
                value={state.yardageMaxText}
                onChange={(event) =>
                  update("yardageMaxText", event.target.value)
                }
                inputMode="numeric"
                maxLength={6}
                autoComplete="off"
                aria-invalid={Boolean(errors.yardage)}
              />
            </div>
          </div>
          <FieldDescription>{es.patterns.form.yardageHint}</FieldDescription>
          <FieldError>{errors.yardage}</FieldError>
        </Field>

        <Field data-invalid={errors.needles ? true : undefined}>
          <FieldLabel htmlFor="needle-sizes">
            {es.patterns.form.needlesLabel}
          </FieldLabel>
          <Input
            id="needle-sizes"
            value={state.needleSizes}
            onChange={(event) => update("needleSizes", event.target.value)}
            placeholder={es.patterns.form.needlesPlaceholder}
            maxLength={TEXT_MAX}
            autoComplete="off"
            aria-invalid={Boolean(errors.needles)}
          />
          <FieldError>{errors.needles}</FieldError>
        </Field>

        <Field data-invalid={errors.gauge ? true : undefined}>
          <FieldLabel htmlFor="gauge">{es.patterns.form.gaugeLabel}</FieldLabel>
          <Input
            id="gauge"
            value={state.gauge}
            onChange={(event) => update("gauge", event.target.value)}
            placeholder={es.patterns.form.gaugePlaceholder}
            maxLength={TEXT_MAX}
            autoComplete="off"
            aria-invalid={Boolean(errors.gauge)}
          />
          <FieldError>{errors.gauge}</FieldError>
        </Field>

        <Field data-invalid={errors.sizes ? true : undefined}>
          <FieldLabel htmlFor="sizes">{es.patterns.form.sizesLabel}</FieldLabel>
          <Input
            id="sizes"
            value={state.sizes}
            onChange={(event) => update("sizes", event.target.value)}
            placeholder={es.patterns.form.sizesPlaceholder}
            maxLength={SIZES_MAX}
            autoComplete="off"
            aria-invalid={Boolean(errors.sizes)}
          />
          <FieldError>{errors.sizes}</FieldError>
        </Field>

        <Field data-invalid={errors.language ? true : undefined}>
          <FieldLabel htmlFor="language">
            {es.patterns.form.languageLabel}
          </FieldLabel>
          <select
            id="language"
            value={state.language}
            onChange={(event) => update("language", event.target.value)}
            className={selectStyles}
          >
            {PATTERN_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {languageLabel(language)}
              </option>
            ))}
          </select>
          <FieldError>{errors.language}</FieldError>
        </Field>
      </FieldGroup>

      {formError ? (
        <p
          className="text-destructive text-sm"
          data-testid="pattern-form-error"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>{es.patterns.form.cancel}</Link>
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          data-testid="pattern-form-submit"
        >
          {pending
            ? es.patterns.form.saving
            : mode === "create"
              ? es.patterns.form.createCta
              : es.patterns.form.saveCta}
        </Button>
      </div>
    </form>
  );
}
