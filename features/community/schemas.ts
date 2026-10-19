import { z } from "zod";

import {
  GROUP_CATEGORIES,
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_RULES_MAX,
  JOIN_POLICIES,
  POST_BODY_MAX,
  THREAD_BODY_MAX,
  THREAD_PHOTOS_MAX,
  THREAD_TITLE_MAX,
  THREAD_TYPES,
  type GroupRole,
  type ThreadType,
} from "@/db/community-schema";
import { slugify } from "@/lib/slug";
import { es } from "@/messages/es";

/**
 * Validación y reglas chicas de la comunidad (spec §5.9).
 *
 * `groupFormSchema` es el esquema del formulario de grupo: a diferencia de
 * otros formularios, todo llega ya como texto o elección, así que el mismo
 * esquema sirve para el cliente y para la acción del servidor (que revalida
 * siempre, spec §9). Acá también viven los helpers puros de permisos, los
 * esquemas de hilos y respuestas, y el orden de la lista de integrantes.
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

export const threadFormSchema = z
  .object({
    groupId: z.string().min(1),
    type: z.enum(THREAD_TYPES, {
      message: es.community.errors.threadTypeInvalid,
    }),
    title: z
      .string()
      .trim()
      .min(1, es.community.errors.titleRequired)
      .max(THREAD_TITLE_MAX, es.community.errors.titleLong),
    body: z.string().trim().max(THREAD_BODY_MAX, es.community.errors.bodyLong),
    imageIds: z.array(z.string().min(1)).max(THREAD_PHOTOS_MAX),
    /** Proyecto que acompaña al hilo ("Pedir ayuda"; opcional). */
    projectId: z.string().min(1).optional(),
  })
  .refine((data) => data.body.length > 0 || data.imageIds.length > 0, {
    path: ["body"],
    message: es.community.errors.emptyThread,
  });

export type ThreadFormValues = z.infer<typeof threadFormSchema>;

export const postFormSchema = z
  .object({
    threadId: z.string().min(1),
    body: z.string().trim().max(POST_BODY_MAX, es.community.errors.bodyLong),
    imageIds: z.array(z.string().min(1)).max(THREAD_PHOTOS_MAX),
  })
  .refine((data) => data.body.length > 0 || data.imageIds.length > 0, {
    path: ["body"],
    message: es.community.errors.emptyPost,
  });

export type PostFormValues = z.infer<typeof postFormSchema>;

export const solutionSchema = z.object({
  threadId: z.string().min(1),
  postId: z.string().min(1),
});

export const threadFlagSchema = z.object({
  threadId: z.string().min(1),
  flag: z.enum(["pinned", "locked"]),
  value: z.boolean(),
});

/** Tipos de hilo que puede abrir cada rol: los anuncios son de moderación. */
export function canCreateThreadType(
  role: GroupRole | null,
  type: ThreadType,
): boolean {
  return type !== "anuncio" || canModerate(role);
}

/** Quien abrió la pregunta o la moderación del grupo deciden la solución. */
export function canMarkSolution(input: {
  viewerRole: GroupRole | null;
  isAuthor: boolean;
}): boolean {
  return input.isAuthor || canModerate(input.viewerRole);
}

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
