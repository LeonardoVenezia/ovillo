import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import type { ProfileVisibility } from "./profile-schema";

/**
 * Guardados y colecciones (spec §5.8 y tablas `collection` / `saved_item` de
 * §6): favoritos de patrones, proyectos y lanas, organizables en colecciones
 * con nombre y visibilidad.
 *
 * Decisiones (D-052):
 * - `saved_item` es **polimórfico** (`target_type` + `target_id`), como pide
 *   la spec: patrón, proyecto o lana. La integridad del destino la cuida la
 *   aplicación (cada alta verifica que exista y se pueda ver); al borrar un
 *   proyecto, sus guardados ajenos se limpian en la misma acción.
 * - Un guardado por persona y destino (`unique`): guardar de nuevo es un
 *   no-op, así el botón de la ficha funciona como interruptor.
 * - La colección es opcional: sin colección, el guardado vive en "Sin
 *   colección" y borrar la colección no borra los guardados (`set null`).
 * - La visibilidad es de la colección (`privado` por defecto): solo las
 *   colecciones públicas se muestran en el perfil para quien no es su dueña.
 */

export const SAVED_TYPES = ["patron", "proyecto", "lana"] as const;

export type SavedType = (typeof SAVED_TYPES)[number];

export function isSavedType(value: string): value is SavedType {
  return (SAVED_TYPES as readonly string[]).includes(value);
}

/** Topes razonables para listas personales (spec §5.8). */
export const COLLECTION_LIMIT = 50;
export const SAVED_LIMIT = 500;
export const COLLECTION_NAME_MAX = 60;

export const collection = pgTable(
  "collection",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** `privado` por defecto: el perfil solo muestra las públicas (D-052). */
    visibility: text("visibility")
      .$type<ProfileVisibility>()
      .notNull()
      .default("privado"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("collection_user_name_unique").on(table.userId, table.name),
    index("collection_user_idx").on(table.userId, table.createdAt),
  ],
);

export const collectionRelations = relations(collection, ({ one, many }) => ({
  user: one(user, {
    fields: [collection.userId],
    references: [user.id],
  }),
  items: many(savedItem),
}));

export const savedItem = pgTable(
  "saved_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    collectionId: text("collection_id").references(() => collection.id, {
      onDelete: "set null",
    }),
    targetType: text("target_type").$type<SavedType>().notNull(),
    /** Id del patrón, proyecto o lana guardados (polimórfico, D-052). */
    targetId: text("target_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("saved_item_user_target_unique").on(
      table.userId,
      table.targetType,
      table.targetId,
    ),
    index("saved_item_user_idx").on(table.userId, table.createdAt),
    index("saved_item_target_idx").on(table.targetType, table.targetId),
  ],
);

export const savedItemRelations = relations(savedItem, ({ one }) => ({
  user: one(user, {
    fields: [savedItem.userId],
    references: [user.id],
  }),
  collection: one(collection, {
    fields: [savedItem.collectionId],
    references: [collection.id],
  }),
}));
