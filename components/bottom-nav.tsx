"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, House, Notebook, Users, type LucideIcon } from "lucide-react";

import { BottomNavCreateButton } from "@/components/create-sheet";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const items: NavItem[] = [
  { href: "/", label: es.nav.home, icon: House, exact: true },
  { href: "/explorar", label: es.nav.explore, icon: Compass },
  { href: "/comunidad", label: es.nav.community, icon: Users },
  { href: "/mi-tejido", label: es.nav.myWork, icon: Notebook },
];

function isActive(pathname: string, item: NavItem) {
  return (
    pathname === item.href ||
    (!item.exact && pathname.startsWith(`${item.href}/`))
  );
}

function BottomNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon
        className="size-5"
        strokeWidth={active ? 2 : 1.5}
        aria-hidden="true"
      />
      {item.label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const left = items.slice(0, 2);
  const right = items.slice(2);

  return (
    <nav
      aria-label={es.nav.primary}
      className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid h-16 w-full max-w-lg grid-cols-5">
        {left.map((item) => (
          <BottomNavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item)}
          />
        ))}
        <div className="flex justify-center">
          <BottomNavCreateButton />
        </div>
        {right.map((item) => (
          <BottomNavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item)}
          />
        ))}
      </div>
    </nav>
  );
}
