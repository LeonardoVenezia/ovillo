import type { Metadata } from "next";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ResendVerificationButton } from "@/features/auth/components/resend-verification-button";
import { YarnForm } from "@/features/yarn/components/yarn-form";
import { listBrands } from "@/features/yarn/queries";
import { emptyYarnForm } from "@/features/yarn/schemas";
import { requireUser } from "@/lib/session";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.yarns.proposeTitle,
};

/**
 * Proponer una lana (spec §5.6): piden sesión (el proxy redirige) y email
 * confirmado. Sin verificación queda el aviso con el botón para reenviar el
 * email; la acción lo revalida igual en el servidor.
 */
export default function ProposeYarnPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.yarns.proposeTitle}
        </h1>
        <p className="text-muted-foreground text-sm">{es.yarns.proposeIntro}</p>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ProposeContent />
      </Suspense>
    </section>
  );
}

async function ProposeContent() {
  const user = await requireUser();

  if (!user.emailVerified) {
    return (
      <Alert data-testid="yarn-verified-notice">
        <AlertTitle>{es.yarns.form.verifiedTitle}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{es.yarns.form.verifiedBody}</span>
          <ResendVerificationButton email={user.email} />
        </AlertDescription>
      </Alert>
    );
  }

  const brands = await listBrands();
  return (
    <YarnForm
      mode="create"
      brands={brands}
      initial={emptyYarnForm}
      cancelHref="/explorar/lanas"
    />
  );
}
