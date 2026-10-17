import type { Metadata } from "next";
import Link from "next/link";
import { Egg } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
        <Egg className="size-7" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h1 className="font-heading text-2xl font-semibold">
        Acá no hay nada tejido todavía
      </h1>
      <p className="text-muted-foreground text-sm">
        La página que buscas no existe o cambió de lugar.
      </p>
      <Button asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </section>
  );
}
