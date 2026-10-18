"use client";

import {
  BookOpen,
  ChevronRight,
  CircleHelp,
  NotebookPen,
  PackagePlus,
  Plus,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { es } from "@/messages/es";

const items: { icon: LucideIcon; label: string; href?: string }[] = [
  {
    icon: Shirt,
    label: es.create.items.project,
    href: "/mi-tejido/proyectos/nuevo",
  },
  {
    icon: NotebookPen,
    label: es.create.items.entry,
    href: "/mi-tejido/proyectos",
  },
  { icon: PackagePlus, label: es.create.items.yarn },
  { icon: CircleHelp, label: es.create.items.question },
  { icon: BookOpen, label: es.create.items.pattern },
];

function CreateSheetBody() {
  return (
    <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl">
      <SheetHeader className="text-left">
        <SheetTitle className="font-heading text-lg">
          {es.create.title}
        </SheetTitle>
        <SheetDescription>{es.create.subtitle}</SheetDescription>
      </SheetHeader>
      <div className="px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <ul className="flex flex-col gap-1">
          {items.map(({ icon: Icon, label, href }) => (
            <li key={label}>
              {href ? (
                <SheetClose asChild>
                  <Link
                    href={href}
                    className="hover:bg-muted focus-visible:outline-ring flex items-center gap-3 rounded-xl px-3 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <Icon
                      className="size-5"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">{label}</span>
                    <ChevronRight
                      className="text-muted-foreground ml-auto size-4"
                      aria-hidden="true"
                    />
                  </Link>
                </SheetClose>
              ) : (
                <span className="text-muted-foreground flex items-center gap-3 rounded-xl px-3 py-3">
                  <Icon
                    className="size-5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium">{label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {es.create.soonBadge}
                  </Badge>
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground px-3 pt-3 text-xs">
          {es.create.note}
        </p>
      </div>
    </SheetContent>
  );
}

export function HeaderCreateButton() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="lg">
          <Plus data-icon="inline-start" />
          {es.nav.create}
        </Button>
      </SheetTrigger>
      <CreateSheetBody />
    </Sheet>
  );
}

export function BottomNavCreateButton() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={es.nav.create}
          className="border-background bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-ring flex size-14 -translate-y-4 items-center justify-center rounded-full border-4 shadow-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Plus className="size-6" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <CreateSheetBody />
    </Sheet>
  );
}
