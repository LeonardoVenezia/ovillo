import Link from "next/link";

import { Button } from "@/components/ui/button";
import { es } from "@/messages/es";

export default function HomePage() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-start gap-6 py-10 md:py-20">
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
    </section>
  );
}
