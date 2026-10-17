"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { saveOnboarding } from "../actions";
import type { Craft, SkillLevel } from "../constants";
import { CountrySelect, CraftChips, SkillPicker } from "./pickers";
import { onboardingSchema } from "../schemas";

/**
 * Bienvenida de 2 pasos, salteable (spec §5.1: técnicas + nivel, y
 * país/región). El paso 3 de la spec (grupos y personas para seguir) llega
 * con la Comunidad, cuando existan grupos y personas (ver D-024).
 */

export type OnboardingInitial = {
  crafts: Craft[];
  skillLevel: SkillLevel | "";
  country: string;
  location: string;
};

export function OnboardingWizard({
  name,
  initial,
}: {
  name: string;
  initial: OnboardingInitial;
}) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const [crafts, setCrafts] = useState<Craft[]>(initial.crafts);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | "">(
    initial.skillLevel,
  );
  const [country, setCountry] = useState(initial.country);
  const [location, setLocation] = useState(initial.location);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = crafts.length > 0 && skillLevel !== "";
  const canFinish = country !== "" && !saving;

  async function handleFinish() {
    setError(null);
    const parsed = onboardingSchema.safeParse({
      crafts,
      skillLevel,
      country,
      location,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setError(first?.message ?? es.profile.errors.generic);
      return;
    }

    setSaving(true);
    try {
      const result = await saveOnboarding(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(es.onboarding.saved);
      router.push("/mi-tejido");
      router.refresh();
    } catch {
      setError(es.profile.errors.generic);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-heading text-xl font-semibold">
            {es.onboarding.hello} {name}!
          </CardTitle>
          <Button variant="ghost" size="sm" className="shrink-0" asChild>
            <Link href="/mi-tejido">{es.onboarding.skip}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div
            className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
            role="presentation"
          >
            <div
              className={cn(
                "bg-primary h-full transition-all",
                step === 0 ? "w-1/2" : "w-full",
              )}
            />
          </div>
          <p className="text-muted-foreground text-xs" aria-live="polite">
            {step === 0 ? es.onboarding.stepOne : es.onboarding.stepTwo}
          </p>
        </div>

        {step === 0 ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-medium">{es.onboarding.craftsTitle}</p>
                <FieldDescription>{es.onboarding.craftsBody}</FieldDescription>
              </div>
              <CraftChips value={crafts} onChange={setCrafts} />
            </div>
            <div className="flex flex-col gap-3">
              <p className="font-medium">{es.onboarding.levelTitle}</p>
              <SkillPicker value={skillLevel} onChange={setSkillLevel} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div>
              <p className="font-medium">{es.onboarding.countryTitle}</p>
              <FieldDescription>{es.onboarding.countryBody}</FieldDescription>
            </div>
            <Field>
              <FieldLabel htmlFor="country">
                {es.onboarding.countryLabel}
              </FieldLabel>
              <CountrySelect
                id="country"
                value={country}
                onChange={setCountry}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="location">
                {es.onboarding.locationLabel}
              </FieldLabel>
              <Input
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={es.onboarding.locationPlaceholder}
                autoComplete="address-level2"
              />
            </Field>
          </div>
        )}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {step === 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setStep(0)}
            >
              {es.onboarding.back}
            </Button>
          ) : (
            <span />
          )}
          {step === 0 ? (
            <Button
              type="button"
              size="lg"
              disabled={!canContinue}
              onClick={() => setStep(1)}
            >
              {es.onboarding.next}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              disabled={!canFinish}
              onClick={handleFinish}
            >
              {saving ? es.onboarding.finishing : es.onboarding.finish}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
