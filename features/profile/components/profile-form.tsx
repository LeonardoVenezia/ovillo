"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
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
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { updateProfile } from "../actions";
import type { Craft, SkillLevel } from "../constants";
import type { CountryCode } from "../countries";
import {
  BIO_MAX,
  profileUpdateSchema,
  type ProfileUpdateValues,
} from "../schemas";
import { CountrySelect, CraftChips, SkillPicker } from "./pickers";

/**
 * Edición del perfil desde Configuración (spec §5.1). Mismo vocabulario y
 * selectores que la bienvenida.
 */

export type ProfileFormInitial = {
  bio: string;
  location: string;
  country: CountryCode | "";
  crafts: Craft[];
  skillLevel: SkillLevel | "";
  instagram: string;
  website: string;
  visibility: "publico" | "privado";
};

export function ProfileForm({
  username,
  initial,
}: {
  username: string | null;
  initial: ProfileFormInitial;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProfileUpdateValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: ProfileUpdateValues) {
    setFormError(null);
    try {
      const result = await updateProfile(values);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      toast.success(es.profile.saved);
    } catch {
      setFormError(es.profile.errors.generic);
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
        <Field data-invalid={errors.bio ? true : undefined}>
          <FieldLabel htmlFor="bio">{es.profile.bioLabel}</FieldLabel>
          <Textarea
            id="bio"
            rows={3}
            maxLength={BIO_MAX}
            placeholder={es.profile.bioPlaceholder}
            aria-invalid={Boolean(errors.bio)}
            {...form.register("bio")}
          />
          <FieldDescription>{es.profile.bioHint}</FieldDescription>
          <FieldError errors={[errors.bio]} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={errors.location ? true : undefined}>
            <FieldLabel htmlFor="location">
              {es.profile.locationLabel}
            </FieldLabel>
            <Input
              id="location"
              autoComplete="address-level2"
              placeholder={es.profile.locationPlaceholder}
              aria-invalid={Boolean(errors.location)}
              {...form.register("location")}
            />
            <FieldError errors={[errors.location]} />
          </Field>

          <Field data-invalid={errors.country ? true : undefined}>
            <FieldLabel htmlFor="country">
              {es.profile.countryLabel}
            </FieldLabel>
            <Controller
              control={form.control}
              name="country"
              render={({ field }) => (
                <CountrySelect
                  id="country"
                  value={field.value}
                  onChange={field.onChange}
                  emptyLabel={es.profile.countryNone}
                />
              )}
            />
            <FieldError errors={[errors.country]} />
          </Field>
        </div>

        <FieldSet>
          <FieldLegend variant="label">{es.profile.craftsTitle}</FieldLegend>
          <Controller
            control={form.control}
            name="crafts"
            render={({ field }) => (
              <CraftChips value={field.value} onChange={field.onChange} />
            )}
          />
          <FieldError errors={[errors.crafts]} />
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">{es.profile.levelTitle}</FieldLegend>
          <Controller
            control={form.control}
            name="skillLevel"
            render={({ field }) => (
              <SkillPicker
                allowEmpty
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <FieldError errors={[errors.skillLevel]} />
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">{es.profile.linksTitle}</FieldLegend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={errors.instagram ? true : undefined}>
              <FieldLabel htmlFor="instagram">
                {es.profile.instagramLabel}
              </FieldLabel>
              <Input
                id="instagram"
                placeholder={es.profile.instagramPlaceholder}
                aria-invalid={Boolean(errors.instagram)}
                {...form.register("instagram")}
              />
              <FieldError errors={[errors.instagram]} />
            </Field>

            <Field data-invalid={errors.website ? true : undefined}>
              <FieldLabel htmlFor="website">
                {es.profile.websiteLabel}
              </FieldLabel>
              <Input
                id="website"
                inputMode="url"
                placeholder={es.profile.websitePlaceholder}
                aria-invalid={Boolean(errors.website)}
                {...form.register("website")}
              />
              <FieldError errors={[errors.website]} />
            </Field>
          </div>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">{es.profile.visibilityTitle}</FieldLegend>
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
                            ? es.profile.visibilityPublic
                            : es.profile.visibilityPrivate}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {value === "publico"
                            ? es.profile.visibilityPublicBody
                            : es.profile.visibilityPrivateBody}
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
            {isSubmitting ? es.profile.saving : es.profile.save}
          </Button>
          {username ? (
            <Button variant="ghost" size="lg" asChild>
              <Link href={`/@${username}`}>{es.profile.viewLink}</Link>
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
