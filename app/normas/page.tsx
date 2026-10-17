import type { Metadata } from "next";

import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.norms.title,
};

export default function NormsPage() {
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {es.norms.title}
      </h1>
      <p className="text-muted-foreground text-lg">{es.norms.intro}</p>
      <ul className="flex flex-col gap-3">
        {es.norms.items.map((item) => (
          <li key={item} className="flex gap-3 text-sm md:text-base">
            <span aria-hidden className="text-sage">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm">{es.norms.note}</p>
    </article>
  );
}
