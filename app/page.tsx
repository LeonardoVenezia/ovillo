import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { getOptionalUser, type SessionUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Inicio (spec §7: "landing pública sin sesión o feed con sesión").
 *
 * El feed llega en Fase 7; mientras tanto, con sesión la portada saluda y
 * lleva a Mi tejido. El caparazón estático es la versión para visitantes y
 * la variante con sesión se transmite aparte (D-005/D-019).
 */

export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start gap-6 py-10 md:py-20">
      <Suspense fallback={<HomeHero user={null} />}>
        <SignedInHomeHero />
      </Suspense>
    </section>
  );
}

async function SignedInHomeHero() {
  const user = await getOptionalUser();
  return <HomeHero user={user} />;
}

function HomeHero({ user }: { user: SessionUser | null }) {
  if (!user) {
    return (
      <>
        <p className="text-sage text-sm font-medium tracking-wide uppercase">
          {es.landing.eyebrow}
        </p>
        <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
          {es.landing.title}
        </h1>
        <p className="text-muted-foreground text-lg">{es.landing.body}</p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/registro">{es.landing.ctaPrimary}</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/ingresar">{es.landing.ctaSecondary}</Link>
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">{es.landing.note}</p>
      </>
    );
  }

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <>
      <p className="text-sage text-sm font-medium tracking-wide uppercase">
        {es.landing.welcomeEyebrow}
      </p>
      <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
        {es.landing.welcomeGreeting} {firstName}
      </h1>
      <p className="text-muted-foreground text-lg">{es.landing.welcomeBody}</p>
      <div className="flex flex-wrap gap-3">
        <Button size="lg" asChild>
          <Link href="/mi-tejido">{es.landing.ctaMyWork}</Link>
        </Button>
        {user.username ? (
          <Button variant="outline" size="lg" asChild>
            <Link href={`/@${user.username}`}>{es.landing.ctaProfile}</Link>
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">{es.landing.welcomeNote}</p>
    </>
  );
}
