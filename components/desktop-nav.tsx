"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

const links = [
  { href: "/", label: es.nav.home, exact: true },
  { href: "/explorar", label: es.nav.explore, exact: false },
  { href: "/comunidad", label: es.nav.community, exact: false },
  { href: "/mi-tejido", label: es.nav.myWork, exact: false },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label={es.nav.primary}
      className="hidden items-center gap-1 md:flex"
    >
      {links.map((link) => {
        const active =
          pathname === link.href ||
          (!link.exact && pathname.startsWith(`${link.href}/`));

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
