"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { YARN_FIBERS, YARN_WEIGHTS } from "@/db/yarn-schema";
import { CountrySelect } from "@/features/profile/components/pickers";
import { es } from "@/messages/es";

import {
  checkYarnDuplicate,
  createYarn,
  updateYarn,
  type YarnDuplicateInfo,
} from "../actions";
import { fiberLabel, weightLabel } from "../format";
import type { YarnBrandOption } from "../queries";
import {
  FIBERS_MAX,
  YARN_NAME_MAX,
  parseYarnForm,
  type YarnFieldErrors,
  type YarnFormState,
} from "../schemas";
import { selectStyles } from "@/components/select-styles";

/**
 * Formulario de propuesta y edición de una lana (spec §5.6).
 *
 * Mientras se escribe el nombre, chequea en vivo si ya existe esa lana en esa
 * marca y ofrece el enlace a la existente: el catálogo se cuida entre todos y
 * nadie pierde tiempo cargando un duplicado (el servidor lo vuelve a chequear
 * y la base lo garantiza con su índice único).
 */

export type YarnFormInitial = YarnFormState;

export function YarnForm({
  mode,
  brands,
  initial,
  yarnId,
  cancelHref,
}: {
  mode: "create" | "edit";
  brands: YarnBrandOption[];
  initial: YarnFormInitial;
  /** Solo en modo edición. */
  yarnId?: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<YarnFormState>(initial);
  const [errors, setErrors] = useState<YarnFieldErrors>({});
  const [duplicate, setDuplicate] = useState<YarnDuplicateInfo>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sum = state.fibers.reduce((total, row) => {
    const value = Number(row.percentText.trim().replace(",", "."));
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);

  // Chequeo de duplicados con respiro: 400 ms después de la última tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      const name = state.name.trim();
      const hasBrand =
        state.brandChoice !== "" &&
        (state.brandChoice !== "otra" || state.brandName.trim().length > 0);
      if (name.length === 0 || !hasBrand) {
        setDuplicate(null);
        return;
      }
      void checkYarnDuplicate({
        brandId: state.brandChoice !== "otra" ? state.brandChoice : null,
        brandName: state.brandChoice === "otra" ? state.brandName : "",
        name: state.name,
        excludeYarnId: yarnId,
      })
        .then(setDuplicate)
        .catch(() => setDuplicate(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [state.name, state.brandChoice, state.brandName, yarnId]);

  function update<K extends keyof YarnFormState>(
    key: K,
    value: YarnFormState[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function updateFiber(
    index: number,
    patch: Partial<{ fiber: string; percentText: string }>,
  ) {
    setState((prev) => ({
      ...prev,
      fibers: prev.fibers.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const result = parseYarnForm(state);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      try {
        const saved =
          mode === "create"
            ? await createYarn(result.input)
            : await updateYarn({ ...result.input, id: yarnId ?? "" });
        if (!saved.ok) {
          setFormError(saved.error);
          return;
        }
        toast.success(
          mode === "create" ? es.yarns.form.created : es.yarns.form.saved,
        );
        router.push(`/lanas/${saved.brandSlug}/${saved.slug}`);
        router.refresh();
      } catch {
        setFormError(es.yarns.errors.generic);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      data-testid="yarn-form"
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field data-invalid={errors.brand ? true : undefined}>
          <FieldLabel htmlFor="brand">{es.yarns.form.brandLabel}</FieldLabel>
          <select
            id="brand"
            value={state.brandChoice}
            onChange={(event) => update("brandChoice", event.target.value)}
            className={selectStyles}
          >
            <option value="">{es.yarns.form.brandPlaceholder}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
            <option value="otra">{es.yarns.form.brandOther}</option>
          </select>
          {state.brandChoice === "otra" ? (
            <div className="mt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-name">
                  {es.yarns.form.brandNewLabel}
                </Label>
                <Input
                  id="brand-name"
                  value={state.brandName}
                  onChange={(event) => update("brandName", event.target.value)}
                  placeholder={es.yarns.form.brandNewPlaceholder}
                  maxLength={80}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-country">
                  {es.yarns.form.brandCountryLabel}
                </Label>
                <CountrySelect
                  id="brand-country"
                  value={state.brandCountry}
                  onChange={(value) => update("brandCountry", value)}
                  emptyLabel={es.yarns.form.brandCountryNone}
                />
              </div>
            </div>
          ) : null}
          <FieldError>{errors.brand}</FieldError>
        </Field>

        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor="name">{es.yarns.form.nameLabel}</FieldLabel>
          <Input
            id="name"
            value={state.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder={es.yarns.form.namePlaceholder}
            maxLength={YARN_NAME_MAX}
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        {duplicate ? (
          <Alert data-testid="yarn-duplicate">
            <AlertTitle>{es.yarns.form.duplicateTitle}</AlertTitle>
            <AlertDescription>
              <span>
                {es.yarns.form.duplicateBody
                  .replace("{brand}", duplicate.brandName)
                  .replace("{name}", duplicate.yarnName)}{" "}
                <Link
                  href={duplicate.href}
                  className="underline underline-offset-4"
                >
                  {es.yarns.form.duplicateLink}
                </Link>
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        <Field data-invalid={errors.weight ? true : undefined}>
          <FieldLabel htmlFor="weight">{es.yarns.form.weightLabel}</FieldLabel>
          <select
            id="weight"
            value={state.weight}
            onChange={(event) => update("weight", event.target.value)}
            className={selectStyles}
          >
            <option value="">{es.yarns.form.weightPlaceholder}</option>
            {YARN_WEIGHTS.map((weight) => (
              <option key={weight} value={weight}>
                {weightLabel(weight)}
              </option>
            ))}
          </select>
          <FieldError>{errors.weight}</FieldError>
        </Field>

        <Field data-invalid={errors.fiber ? true : undefined}>
          <FieldLabel htmlFor="fiber-0">{es.yarns.form.fiberTitle}</FieldLabel>
          <FieldDescription>{es.yarns.form.fiberHint}</FieldDescription>
          <div className="flex flex-col gap-3">
            {state.fibers.map((row, index) => (
              <div key={index} className="flex items-start gap-2">
                <select
                  id={`fiber-${index}`}
                  value={row.fiber}
                  onChange={(event) =>
                    updateFiber(index, { fiber: event.target.value })
                  }
                  aria-label={`${es.yarns.form.fiberTitle} ${index + 1}`}
                  className={selectStyles}
                >
                  <option value="">{es.yarns.form.fiberTitle}…</option>
                  {YARN_FIBERS.map((fiber) => (
                    <option key={fiber} value={fiber}>
                      {fiberLabel(fiber)}
                    </option>
                  ))}
                </select>
                <Input
                  value={row.percentText}
                  onChange={(event) =>
                    updateFiber(index, { percentText: event.target.value })
                  }
                  aria-label={`${es.yarns.form.fiberTitle} ${index + 1}: ${es.yarns.form.fiberPercentLabel}`}
                  inputMode="numeric"
                  placeholder={es.yarns.form.fiberPercentLabel}
                  maxLength={3}
                  autoComplete="off"
                  className="w-16 shrink-0 text-center"
                />
                {state.fibers.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={es.yarns.form.fiberRemove}
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        fibers: prev.fibers.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <X aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={state.fibers.length >= FIBERS_MAX}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  fibers: [...prev.fibers, { fiber: "", percentText: "" }],
                }))
              }
            >
              <Plus aria-hidden="true" />
              {es.yarns.form.fiberAdd}
            </Button>
            <p
              className={
                sum === 100
                  ? "text-muted-foreground text-sm"
                  : "text-destructive text-sm"
              }
            >
              {es.yarns.form.fiberSum.replace("{sum}", String(sum))}
            </p>
          </div>
          <FieldError>{errors.fiber}</FieldError>
        </Field>

        <Field data-invalid={errors.grams || errors.meters ? true : undefined}>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="grams">{es.yarns.form.gramsLabel}</Label>
              <Input
                id="grams"
                value={state.gramsText}
                onChange={(event) => update("gramsText", event.target.value)}
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                aria-invalid={Boolean(errors.grams)}
              />
              <FieldError>{errors.grams}</FieldError>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="meters">{es.yarns.form.metersLabel}</Label>
              <Input
                id="meters"
                value={state.metersText}
                onChange={(event) => update("metersText", event.target.value)}
                inputMode="numeric"
                maxLength={5}
                autoComplete="off"
                aria-invalid={Boolean(errors.meters)}
              />
              <FieldError>{errors.meters}</FieldError>
            </div>
          </div>
          <FieldDescription>{es.yarns.form.numbersHint}</FieldDescription>
        </Field>

        <Field data-invalid={errors.needles ? true : undefined}>
          <FieldLabel htmlFor="needle-min">
            {es.yarns.form.needlesLabel}
          </FieldLabel>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="needle-min"
                className="text-muted-foreground text-sm font-normal"
              >
                {es.yarns.form.needlesFrom}
              </Label>
              <Input
                id="needle-min"
                value={state.needleMinText}
                onChange={(event) =>
                  update("needleMinText", event.target.value)
                }
                inputMode="decimal"
                maxLength={5}
                autoComplete="off"
                aria-invalid={Boolean(errors.needles)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="needle-max"
                className="text-muted-foreground text-sm font-normal"
              >
                {es.yarns.form.needlesTo}
              </Label>
              <Input
                id="needle-max"
                value={state.needleMaxText}
                onChange={(event) =>
                  update("needleMaxText", event.target.value)
                }
                inputMode="decimal"
                maxLength={5}
                autoComplete="off"
                aria-invalid={Boolean(errors.needles)}
              />
            </div>
          </div>
          <FieldDescription>{es.yarns.form.needlesHint}</FieldDescription>
          <FieldError>{errors.needles}</FieldError>
        </Field>
      </FieldGroup>

      {formError ? (
        <p className="text-destructive text-sm" data-testid="yarn-form-error">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>{es.yarns.form.cancel}</Link>
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending || duplicate !== null}
          data-testid="yarn-form-submit"
        >
          {pending
            ? es.yarns.form.saving
            : mode === "create"
              ? es.yarns.form.createCta
              : es.yarns.form.saveCta}
        </Button>
      </div>
    </form>
  );
}
