"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { es } from "@/messages/es";

import { setMemberRole } from "../actions";

/**
 * Nombra o quita moderador/a. Solo lo ve quien creó el grupo (spec §5.9);
 * la acción revalida el permiso en el servidor.
 */
export function MemberRoleButton({
  groupId,
  userId,
  role,
}: {
  groupId: string;
  userId: string;
  role: "moderador" | "miembro";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next = role === "moderador" ? "miembro" : "moderador";

  function onClick() {
    startTransition(async () => {
      const result = await setMemberRole({ groupId, userId, role: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        next === "moderador" ? es.community.promoted : es.community.demoted,
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      data-testid="member-role-button"
    >
      {next === "moderador" ? es.community.promote : es.community.demote}
    </Button>
  );
}
