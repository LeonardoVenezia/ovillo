import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { image } from "./media-schema";

/**
 * Comunidad: grupos y membresías (spec §5.9 y tablas `group` / `group_member`
 * de §6). Los hilos, respuestas y KAL/CAL llegan en los próximos tramos de la
 * fase.
 *
 * Decisiones (D-054):
 * - El grupo tiene dueña/o (quien lo creó), moderadores y miembros; la
 *   membresía vive en `group_member` con `role` y `status`, PK compuesta
 *   (una fila por persona y grupo).
 * - `join_policy` define la entrada: `abierto` (entra al toque) o
 *   `aprobacion` (queda `pendiente` hasta que un moderador acepta).
 * - Los grupos se pueden editar pero no borrar todavía: el borrado lógico y
 *   la moderación llegan con el panel de la Fase 8 (D-054).
 */

export const GROUP_CATEGORIES = [
  "tecnica",
  "region",
  "principiantes",
  "disenadoras",
  "charla",
] as const;

export type GroupCategory = (typeof GROUP_CATEGORIES)[number];

export function isGroupCategory(value: string): value is GroupCategory {
  return (GROUP_CATEGORIES as readonly string[]).includes(value);
}

export const GROUP_ROLES = ["dueno", "moderador", "miembro"] as const;

export type GroupRole = (typeof GROUP_ROLES)[number];

export const GROUP_MEMBER_STATUSES = ["activo", "pendiente"] as const;

export type GroupMemberStatus = (typeof GROUP_MEMBER_STATUSES)[number];

export const JOIN_POLICIES = ["abierto", "aprobacion"] as const;

export type JoinPolicy = (typeof JOIN_POLICIES)[number];

export function isJoinPolicy(value: string): value is JoinPolicy {
  return (JOIN_POLICIES as readonly string[]).includes(value);
}

export const GROUP_NAME_MAX = 60;
export const GROUP_DESCRIPTION_MAX = 500;
export const GROUP_RULES_MAX = 1000;

/** Tope de grupos que puede crear una persona (guardia anti-spam liviana). */
export const GROUP_LIMIT = 20;

export const group = pgTable(
  "group",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    /** Slug global único: la URL pública es `/grupos/slug`. */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** Reglas de convivencia del grupo (opcionales). */
    rules: text("rules").notNull().default(""),
    category: text("category").$type<GroupCategory>().notNull(),
    /** Imagen de portada opcional (en R2, como todas las fotos). */
    imageId: text("image_id").references(() => image.id, {
      onDelete: "set null",
    }),
    joinPolicy: text("join_policy")
      .$type<JoinPolicy>()
      .notNull()
      .default("abierto"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("group_slug_unique").on(table.slug),
    index("group_category_idx").on(table.category),
    index("group_created_by_idx").on(table.createdBy),
  ],
);

export const groupMember = pgTable(
  "group_member",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Dueña/o, moderador/a o miembro: define qué puede hacer cada quien. */
    role: text("role").$type<GroupRole>().notNull().default("miembro"),
    /** `pendiente` cuando el grupo es con aprobación y falta el visto bueno. */
    status: text("status")
      .$type<GroupMemberStatus>()
      .notNull()
      .default("activo"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    index("group_member_user_idx").on(table.userId, table.status),
  ],
);

export const groupRelations = relations(group, ({ one, many }) => ({
  creator: one(user, {
    fields: [group.createdBy],
    references: [user.id],
  }),
  image: one(image, {
    fields: [group.imageId],
    references: [image.id],
  }),
  members: many(groupMember),
}));

export const groupMemberRelations = relations(groupMember, ({ one }) => ({
  group: one(group, {
    fields: [groupMember.groupId],
    references: [group.id],
  }),
  user: one(user, {
    fields: [groupMember.userId],
    references: [user.id],
  }),
}));
