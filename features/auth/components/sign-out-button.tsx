"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { hardNavigate } from "@/lib/navigation";
import { es } from "@/messages/es";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await authClient.signOut();
    toast.success(es.auth.signOut.done);
    hardNavigate("/");
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={pending}
    >
      <LogOut data-icon="inline-start" />
      {es.auth.signOut.label}
    </Button>
  );
}
