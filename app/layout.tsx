import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import { BottomNav } from "@/components/bottom-nav";
import { SiteHeader } from "@/components/site-header";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — comunidad de tejido en español`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a17" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={cn("font-sans", inter.variable, fraunces.variable)}
    >
      <body className="antialiased">
        <Providers>
          <a
            href="#contenido"
            className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:px-3 focus:py-2 focus:text-sm"
          >
            {es.common.skipToContent}
          </a>
          <SiteHeader />
          <main
            id="contenido"
            className="mx-auto w-full max-w-4xl px-4 pt-6 pb-28 md:pb-16"
          >
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
