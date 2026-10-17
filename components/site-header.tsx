import Link from "next/link";
import { Suspense } from "react";
import { Bell, Search } from "lucide-react";

import { DesktopNav } from "@/components/desktop-nav";
import { HeaderUser } from "@/components/header-user";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SITE_NAME } from "@/lib/site";
import { es } from "@/messages/es";

export function SiteHeader() {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-40 hidden border-b backdrop-blur md:block">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-2 px-4">
        <Link
          href="/"
          className="font-heading mr-2 text-xl font-semibold tracking-tight"
        >
          {SITE_NAME}
        </Link>
        <DesktopNav />
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled
            title={es.common.comingSoon}
            aria-label={es.nav.search}
          >
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled
            title={es.common.comingSoon}
            aria-label={es.nav.notifications}
          >
            <Bell />
          </Button>
          <ThemeToggle />
          {/* La sesión se lee en el servidor: siempre detrás de Suspense. */}
          <Suspense fallback={<Skeleton className="size-9 rounded-full" />}>
            <HeaderUser />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
