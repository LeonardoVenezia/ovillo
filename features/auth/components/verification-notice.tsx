"use client";

import { Check } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { es } from "@/messages/es";

/** Aviso de confirmación de email para cuando se vuelve desde el enlace. */
export function VerificationNotice() {
  const searchParams = useSearchParams();

  if (searchParams.get("verificado") !== "1") {
    return null;
  }

  return (
    <Alert>
      <Check />
      <AlertTitle>{es.auth.verify.okTitle}</AlertTitle>
      <AlertDescription>{es.auth.verify.okBody}</AlertDescription>
    </Alert>
  );
}
