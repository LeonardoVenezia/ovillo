import Link from "next/link";

import { HeaderCreateButton } from "@/components/create-sheet";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { getOptionalUser } from "@/lib/session";
import { es } from "@/messages/es";

/**
 * Zona de cuenta del encabezado.
 *
 * Lee la sesión, así que siempre vive debajo de un `<Suspense>` (patrón de
 * Next 16 con Cache Components: guía "Authentication with Cache Components").
 */
export async function HeaderUser() {
  const user = await getOptionalUser();

  if (!user) {
    return (
      <>
        <Button variant="ghost" size="lg" asChild>
          <Link href="/ingresar">{es.auth.signIn.label}</Link>
        </Button>
        <Button size="lg" asChild>
          <Link href="/registro">{es.auth.signUp.label}</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <HeaderCreateButton />
      <UserMenu user={user} />
    </>
  );
}
