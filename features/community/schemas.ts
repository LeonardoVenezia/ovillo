import { z } from "zod";

import {
  GROUP_CATEGORIES,
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_RULES_MAX,
  JOIN_POLICIES,
  type GroupRole,
} from "@/db/community-schema";
import { slugify } from "@/lib/slug";
import { es } from "@/messages/es";

/**
 * Validación y reglas chicas de la comunidad (spec §5.9).
 *
 * `groupFormSchema` es el esquema del formulario de grupo: a diferencia de
 * otros formularios, todo llega ya como texto o elección, así que el mismo
 * esquema sirve para el cliente y para la acción del servidor (que revalida
 * siempre, spec §9). Acá también viven los helpers puros de permisos y el
 * orden de la lista de integrantes.
 */

export const groupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, es.community.errors.nameRequired)
    .max(GROUP_NAME_MAX, es.community.errors.nameLong),
  description: z
    .string()
    .trim()
    .max(GROUP_DESCRIPTION_MAX, es.community.errors.descriptionLong),
  rules: z.string().trim().max(GROUP_RULES_MAX, es.community.errors.rulesLong),
  category: z.enum(GROUP_CATEGORIES, {
    message: es.community.errors.categoryInvalid,
  }),
  joinPolicy: z.enum(JOIN_POLICIES, {
    message: es.community.errors.joinPolicyInvalid,
  }),
});

export type GroupFormValues = z.infer<typeof groupFormSchema>;

export const emptyGroupValues: GroupFormValues = {
  name: "",
  description: "",
  rules: "",
  category: "charla",
  joinPolicy: "abierto",
};

export const groupUpdateSchema = z.object({
  groupId: z.string().min(1),
  values: groupFormSchema,
});

export type GroupUpdateInput = z.infer<typeof groupUpdateSchema>;

export const memberActionSchema = z.object({
  groupId: z.string().min(1),
  userId: z.string().min(1),
});

export const memberRoleSchema = z.object({
  groupId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["moderador", "miembro"]),
});

/** Slug público del grupo (`/grupos/slug`); si el nombre no deja nada, `grupo`. */
export function groupSlug(name: string): string {
  return slugify(name, "grupo");
}

/** `dueno` y `moderador` pueden editar el grupo y aceptar solicitudes. */
export function canModerate(role: GroupRole | null | undefined): boolean {
  return role === "dueno" || role === "moderador";
}

/** Solo quien creó el grupo nombra moderadores. */
export function isGroupOwner(role: GroupRole | null | undefined): boolean {
  return role === "dueno";
}

const ROLE_ORDER: Record<GroupRole, number> = {
  dueno: 0,
  moderador: 1,
  miembro: 2,
};

/**
 * Orden de la lista de integrantes: quien creó el grupo, después los
 * moderadores y al final los demás, de más antiguos a más recientes.
 */
export function sortGroupMembers<
  T extends { role: GroupRole; createdAt: Date },
>(members: readonly T[]): T[] {
  return [...members].sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );
}
