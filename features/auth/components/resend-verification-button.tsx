"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { es } from "@/messages/es";

import { mapAuthError } from "../errors";

export function ResendVerificationButton({ email }: { email: string }) {
  const [pending, setPending] = useState(false);

  async function resend() {
    setPending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/mi-tejido?verificado=1",
      });
      if (error) {
        toast.error(mapAuthError(error));
        return;
      }
      toast.success(es.auth.verify.resent);
    } catch (caught) {
      toast.error(mapAuthError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={resend}
      disabled={pending}
    >
      {es.auth.verify.resend}
    </Button>
  );
}
