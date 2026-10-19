"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { es } from "@/messages/es";

import { approveMember, rejectMember } from "../actions";

/**
 * Solicitudes de ingreso de un grupo con aprobación (spec §5.9): aceptar o
 * rechazar, con las acciones revalidando el permiso en el servidor.
 */
export function GroupPending({
  groupId,
  requests,
}: {
  groupId: string;
  requests: {
    userId: string;
    name: string;
    username: string | null;
    image: string | null;
  }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function resolve(userId: string, accept: boolean) {
    startTransition(async () => {
      const result = accept
        ? await approveMember({ groupId, userId })
        : await rejectMember({ groupId, userId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(accept ? es.community.approved : es.community.rejected);
      router.refresh();
    });
  }

  return (
    <ul
      className="border-border divide-border flex flex-col divide-y overflow-hidden rounded-2xl border"
      data-testid="group-pending"
    >
      {requests.map((request) => (
        <li
          key={request.userId}
          className="bg-card flex flex-wrap items-center gap-3 p-3"
        >
          <UserAvatar
            name={request.name}
            image={request.image}
            className="size-9"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{request.name}</p>
            {request.username ? (
              <p className="text-muted-foreground truncate text-xs">
                @{request.username}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => resolve(request.userId, true)}
              data-testid="group-approve"
            >
              {es.community.approve}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => resolve(request.userId, false)}
              data-testid="group-reject"
            >
              {es.community.reject}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
