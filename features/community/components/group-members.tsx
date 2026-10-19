import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { es } from "@/messages/es";

import type { GroupMemberView } from "../queries";
import { MemberRoleButton } from "./member-role-button";

/**
 * Lista de integrantes de un grupo (spec §5.9): quien lo creó primero,
 * después moderadores y miembros. La dueña/o del grupo puede nombrar o
 * quitar moderadores desde acá.
 */
export function GroupMembers({
  groupId,
  members,
  isOwner,
}: {
  groupId: string;
  members: GroupMemberView[];
  /** Quien mira es quien creó el grupo. */
  isOwner: boolean;
}) {
  return (
    <ul
      className="border-border divide-border flex flex-col divide-y overflow-hidden rounded-2xl border"
      data-testid="group-members"
    >
      {members.map((member) => (
        <li key={member.userId} className="bg-card flex items-center gap-3 p-3">
          <UserAvatar
            name={member.name}
            image={member.image}
            className="size-9"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {member.username ? (
                <Link
                  href={`/@${member.username}`}
                  className="truncate text-sm font-medium underline-offset-4 hover:underline"
                >
                  {member.name}
                </Link>
              ) : (
                <span className="truncate text-sm font-medium">
                  {member.name}
                </span>
              )}
              {member.role !== "miembro" ? (
                <Badge variant="secondary">
                  {es.community.roleLabels[member.role]}
                </Badge>
              ) : null}
            </div>
            {member.username ? (
              <p className="text-muted-foreground truncate text-xs">
                @{member.username}
              </p>
            ) : null}
          </div>
          {isOwner && member.role !== "dueno" ? (
            <MemberRoleButton
              groupId={groupId}
              userId={member.userId}
              role={member.role}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
