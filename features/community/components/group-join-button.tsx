"use client";

import { Clock, LogOut, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { es } from "@/messages/es";

import { joinGroup, leaveGroup } from "../actions";

type JoinState = "fuera" | "pendiente" | "miembro";

/**
 * Botón de membresía de la ficha del grupo (spec §5.9): unirse, cancelar la
 * solicitud o salir, según el estado. Con grupos "con aprobación" la unión
 * queda pendiente hasta que un moderador acepta. Quien creó el grupo no ve
 * este botón (la ficha muestra una nota en su lugar).
 */
export function GroupJoinButton({
  groupId,
  joinPolicy,
  initialState,
}: {
  groupId: string;
  joinPolicy: "abierto" | "aprobacion";
  initialState: JoinState;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<JoinState>(initialState);

  function onClick() {
    startTransition(async () => {
      if (state === "fuera") {
        const result = await joinGroup(groupId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (result.status === "activo") {
          setState("miembro");
          toast.success(es.community.joined);
        } else {
          setState("pendiente");
          toast.success(es.community.requested);
        }
        router.refresh();
        return;
      }

      const wasPending = state === "pendiente";
      const result = await leaveGroup(groupId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setState("fuera");
      toast.success(
        wasPending ? es.community.requestCancelled : es.community.left,
      );
      router.refresh();
    });
  }

  const label =
    state === "miembro"
      ? es.community.leaveCta
      : state === "pendiente"
        ? es.community.cancelRequestCta
        : joinPolicy === "abierto"
          ? es.community.joinCta
          : es.community.requestCta;

  return (
    <Button
      type="button"
      variant={state === "miembro" ? "outline" : "default"}
      onClick={onClick}
      disabled={isPending}
      data-testid="group-join-button"
    >
      {state === "miembro" ? (
        <LogOut aria-hidden />
      ) : state === "pendiente" ? (
        <Clock aria-hidden />
      ) : (
        <UserPlus aria-hidden />
      )}
      {label}
    </Button>
  );
}
