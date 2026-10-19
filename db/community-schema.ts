import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { image } from "./media-schema";
import { project } from "./project-schema";

/**
 * Comunidad: grupos, membresías, hilos, respuestas y KAL/CAL (spec §5.9,
 * §5.10 y tablas `group` / `group_member` / `thread` / `post` / `event` /
 * `event_participant` de §6).
 *
 * Decisiones (D-054, D-055 y D-056):
 * - El grupo tiene dueña/o (quien lo creó), moderadores y miembros; la
 *   membresía vive en `group_member` con `role` y `status`, PK compuesta
 *   (una fila por persona y grupo).
 * - `join_policy` define la entrada: `abierto` (entra al toque) o
 *   `aprobacion` (queda `pendiente` hasta que un moderador acepta).
 * - Los grupos se pueden editar pero no borrar todavía: el borrado lógico y
 *   la moderación llegan con el panel de la Fase 8 (D-054).
 * - Los hilos tienen tipo (`pregunta`, `charla`, `muestro` y `anuncio`, este
 *   último solo para moderación), se pueden fijar y cerrar, y una pregunta
 *   puede marcarse con una respuesta solución (D-055).
 * - `thread.project_id` acompaña el "Pedir ayuda" desde un proyecto (D-055):
 *   la ficha del hilo muestra la tarjeta del proyecto con sus fotos y patrón.
 * - Un KAL/CAL es un evento del grupo con hilo propio (`event.thread_id`):
 *   la conversación vive en el hilo y el evento aporta fechas, patrones,
 *   etapas opcionales y participantes con su proyecto (D-056).
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

export const THREAD_TYPES = [
  "pregunta",
  "charla",
  "muestro",
  "anuncio",
] as const;

export type ThreadType = (typeof THREAD_TYPES)[number];

export function isThreadType(value: string): value is ThreadType {
  return (THREAD_TYPES as readonly string[]).includes(value);
}

export const THREAD_TITLE_MAX = 120;
export const THREAD_BODY_MAX = 4000;
export const POST_BODY_MAX = 4000;
/** Fotos por hilo o respuesta (mismo tope que una entrada del diario). */
export const THREAD_PHOTOS_MAX = 4;

/** Técnica del evento: KAL (dos agujas) o CAL (crochet), spec §5.10. */
export const EVENT_CRAFTS = ["dos-agujas", "crochet"] as const;

export type EventCraft = (typeof EVENT_CRAFTS)[number];

export function isEventCraft(value: string): value is EventCraft {
  return (EVENT_CRAFTS as readonly string[]).includes(value);
}

export const EVENT_NAME_MAX = 120;
/** Patrones de la biblioteca que acompañan al evento (`pattern_ids`). */
export const EVENT_PATTERNS_MAX = 4;
/** Etapas opcionales ("una por semana"); tope generoso para KAL/CAL largos. */
export const EVENT_STAGES_MAX = 8;
export const EVENT_STAGE_TITLE_MAX = 80;
export const EVENT_STAGE_NOTE_MAX = 240;

/** Etapa del evento: el título es obligatorio y la nota, opcional. */
export type EventStage = { title: string; note: string };

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

export const thread = pgTable(
  "thread",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    groupId: text("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<ThreadType>().notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** Fotos del hilo (ids de `image`, como en las entradas del diario). */
    imageIds: jsonb("image_ids").$type<string[]>().notNull().default([]),
    /** Proyecto que acompaña al hilo ("Pedir ayuda", spec §5.9). */
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    pinned: boolean("pinned").notNull().default(false),
    locked: boolean("locked").notNull().default(false),
    /**
     * Respuesta marcada como solución (solo en preguntas). La relación es
     * circular con `post`, así que el tipo se resuelve tarde (`AnyPgColumn`).
     */
    solutionPostId: text("solution_post_id").references(
      (): AnyPgColumn => post.id,
      { onDelete: "set null" },
    ),
    /** Orden de la lista: lo último que pasó en el hilo. */
    lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("thread_group_idx").on(table.groupId, table.lastActivityAt),
    index("thread_author_idx").on(table.authorId, table.createdAt),
  ],
);

export const post = pgTable(
  "post",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    threadId: text("thread_id")
      .notNull()
      .references(() => thread.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    imageIds: jsonb("image_ids").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("post_thread_idx").on(table.threadId, table.createdAt),
    index("post_author_idx").on(table.authorId, table.createdAt),
  ],
);

export const event = pgTable(
  "event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    groupId: text("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    /**
     * Hilo propio del evento (spec §5.10): ahí vive la conversación y el
     * título y el cuerpo se editan junto con el KAL/CAL.
     */
    threadId: text("thread_id")
      .notNull()
      .references(() => thread.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** KAL cuando es con dos agujas; CAL cuando es a crochet. */
    craft: text("craft").$type<EventCraft>().notNull(),
    /** Fechas de calendario (sin hora): el estado se deriva con `hoy`. */
    startsAt: date("starts_at").notNull(),
    endsAt: date("ends_at").notNull(),
    /** Patrones de la biblioteca que acompañan al evento (0 a 4). */
    patternIds: jsonb("pattern_ids").$type<string[]>().notNull().default([]),
    /** Etapas opcionales del tejido (0 a 8), en orden. */
    stages: jsonb("stages").$type<EventStage[]>().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("event_thread_unique").on(table.threadId),
    index("event_group_idx").on(table.groupId, table.startsAt),
    index("event_creator_idx").on(table.createdBy),
  ],
);

export const eventParticipant = pgTable(
  "event_participant",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Proyecto propio que la persona teje en el evento (se puede cambiar). */
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
    index("event_participant_user_idx").on(table.userId),
    index("event_participant_project_idx").on(table.projectId),
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
  threads: many(thread),
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

export const threadRelations = relations(thread, ({ one, many }) => ({
  group: one(group, {
    fields: [thread.groupId],
    references: [group.id],
  }),
  author: one(user, {
    fields: [thread.authorId],
    references: [user.id],
  }),
  project: one(project, {
    fields: [thread.projectId],
    references: [project.id],
  }),
  posts: many(post),
}));

export const postRelations = relations(post, ({ one }) => ({
  thread: one(thread, {
    fields: [post.threadId],
    references: [thread.id],
  }),
  author: one(user, {
    fields: [post.authorId],
    references: [user.id],
  }),
}));

export const eventRelations = relations(event, ({ one, many }) => ({
  group: one(group, {
    fields: [event.groupId],
    references: [group.id],
  }),
  thread: one(thread, {
    fields: [event.threadId],
    references: [thread.id],
  }),
  creator: one(user, {
    fields: [event.createdBy],
    references: [user.id],
  }),
  participants: many(eventParticipant),
}));

export const eventParticipantRelations = relations(
  eventParticipant,
  ({ one }) => ({
    event: one(event, {
      fields: [eventParticipant.eventId],
      references: [event.id],
    }),
    user: one(user, {
      fields: [eventParticipant.userId],
      references: [user.id],
    }),
    project: one(project, {
      fields: [eventParticipant.projectId],
      references: [project.id],
    }),
  }),
);
