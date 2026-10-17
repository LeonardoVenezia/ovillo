import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Compass } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.devUi.title,
};

const swatches = [
  { name: "background", className: "bg-background" },
  { name: "card", className: "bg-card" },
  { name: "muted", className: "bg-muted" },
  { name: "secondary", className: "bg-secondary" },
  { name: "accent", className: "bg-accent" },
  { name: "primary", className: "bg-primary" },
  { name: "sage", className: "bg-sage" },
  { name: "destructive", className: "bg-destructive" },
  { name: "border", className: "bg-border" },
];

const radii = ["rounded-md", "rounded-lg", "rounded-xl", "rounded-2xl"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="flex flex-col gap-10 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.devUi.title}
        </h1>
        <p className="text-muted-foreground text-sm">{es.devUi.note}</p>
      </header>

      <Section title={es.devUi.colors}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {swatches.map((swatch) => (
            <div key={swatch.name} className="flex flex-col gap-2">
              <div
                className={cn(
                  "border-border h-16 rounded-xl border",
                  swatch.className,
                )}
              />
              <code className="text-muted-foreground text-xs">
                {swatch.name}
              </code>
            </div>
          ))}
        </div>
      </Section>

      <Section title={es.devUi.typography}>
        <div className="flex flex-col gap-3">
          <p className="font-heading text-4xl font-semibold tracking-tight">
            Fraunces 4xl semibold
          </p>
          <p className="font-heading text-2xl font-semibold">
            Fraunces 2xl semibold
          </p>
          <p className="max-w-prose text-base">
            Inter 16px — cuerpo de texto para leer con calma, con interlineado
            1,5 y mucho aire alrededor.
          </p>
          <p className="text-muted-foreground text-sm">
            Inter 14px — texto secundario, ayuda de campo y metadatos.
          </p>
        </div>
      </Section>

      <Section title={es.devUi.radii}>
        <div className="flex flex-wrap items-end gap-3">
          {radii.map((radius) => (
            <div
              key={radius}
              className={cn(
                "border-border bg-card flex h-14 w-24 items-end justify-center border p-2 text-xs",
                radius,
              )}
            >
              {radius.replace("rounded-", "")}
            </div>
          ))}
        </div>
      </Section>

      <Section title={es.devUi.buttons}>
        <div className="flex flex-wrap gap-2">
          <Button>Principal</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="outline">Borde</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="destructive">Eliminar</Button>
          <Button variant="link">Enlace</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">xs</Button>
          <Button size="sm">sm</Button>
          <Button size="lg">lg</Button>
          <Button size="icon" aria-label="Ejemplo de botón con ícono">
            <Compass />
          </Button>
        </div>
      </Section>

      <Section title={es.devUi.form}>
        <div className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="dev-ui-name">Nombre del proyecto</Label>
          <Input id="dev-ui-name" placeholder="Bufanda de invierno" />
          <p className="text-muted-foreground text-xs">
            Así se ve la ayuda de un campo.
          </p>
        </div>
      </Section>

      <Section title={es.devUi.badges}>
        <div className="flex flex-wrap gap-2">
          <Badge>Principal</Badge>
          <Badge variant="secondary">Secundaria</Badge>
          <Badge variant="outline">Borde</Badge>
          <Badge variant="destructive">Error</Badge>
          <Badge className="bg-sage dark:text-primary-foreground text-white">
            Terminado
          </Badge>
        </div>
      </Section>

      <Section title={es.devUi.card}>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle className="font-heading">Bufanda de invierno</CardTitle>
            <CardDescription>Tejiendo · 60% completado</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Lana merino color terracota, agujas de 4 mm.
            </p>
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Continuar</Button>
            <Button size="sm" variant="ghost">
              Compartir
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title={es.devUi.states}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <EmptyState
            icon={Compass}
            title="Estado vacío de ejemplo"
            body="Así se ve un estado vacío: una ilustración simple, una explicación y una acción clara."
          />
        </div>
      </Section>
    </div>
  );
}
