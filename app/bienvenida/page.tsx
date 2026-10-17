import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  isCraft,
  isSkillLevel,
  type Craft,
  type SkillLevel,
} from "@/features/profile/constants";
import { isCountryCode } from "@/features/profile/countries";
import {
  OnboardingWizard,
  type OnboardingInitial,
} from "@/features/profile/components/onboarding-wizard";
import { getProfileByUserId } from "@/features/profile/queries";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.onboarding.title,
};

export default function WelcomePage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.onboarding.title}
        </h1>
        <p className="text-muted-foreground">{es.onboarding.subtitle}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <WelcomeContent />
      </Suspense>
    </section>
  );
}

async function WelcomeContent() {
  const user = await requireUser();
  const profile = await getProfileByUserId(user.id);

  const crafts: Craft[] = (profile?.crafts ?? []).filter(isCraft);
  const skillLevel: SkillLevel | "" =
    profile?.skillLevel && isSkillLevel(profile.skillLevel)
      ? profile.skillLevel
      : "";
  const initial: OnboardingInitial = {
    crafts,
    skillLevel,
    country:
      profile?.country && isCountryCode(profile.country)
        ? profile.country
        : "",
    location: profile?.location ?? "",
  };

  return <OnboardingWizard name={user.name} initial={initial} />;
}
