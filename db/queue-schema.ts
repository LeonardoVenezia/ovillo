import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  date,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { pattern } from "./pattern-schema";
import { stashItem } from "./stash-schema";

/**
 * "Quiero tejer" (spec §5.8 y tabla `queue_item` de §6): la cola de patrones
 * que una persona quiere tejer, ordenable a mano.
 *
 * Decisiones (D-051):
 * - Una entrada por patrón y persona (`unique`): el botón de la ficha suma o
 *   quita, nunca duplica.
 * - El orden se guarda como **índice fraccional**: insertar entre dos vecinos
 *   usa el punto medio (`(a + b) / 2`), así reordenar no renumera la cola
 *   entera. Con listas cortas (tope de 100) la precisión de `double` sobra.
 * - La lana planeada es opcional y apunta al inventario: si esa lana se borra,
 *   el vínculo se va solo (`set null`) y la entrada queda sin lana.
 */

/** Tope de la cola: el servidor lo valida en cada alta. */
export const QUEUE_LIMIT = 100;

/** Las notas de una entrada son cortas (spec §5.8). */
export const QUEUE_NOTES_MAX = 300;

export const queueItem = pgTable(
  "queue_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    patternId: text("pattern_id")
      .notNull()
      .references(() => pattern.id, { onDelete: "cascade" }),
    /** Orden fraccional dentro de la cola de esa persona (menor = primero). */
    position: doublePrecision("position").notNull(),
    /** Lana del inventario apartada para este proyecto futuro (D-051). */
    plannedStashItemId: text("planned_stash_item_id").references(
      () => stashItem.id,
      { onDelete: "set null" },
    ),
    /** Fecha objetivo opcional ("para el cumple de…"); `null` = sin fecha. */
    targetDate: date("target_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("queue_item_user_pattern_unique").on(
      table.userId,
      table.patternId,
    ),
    index("queue_item_user_position_idx").on(table.userId, table.position),
  ],
);

export const queueItemRelations = relations(queueItem, ({ one }) => ({
  user: one(user, {
    fields: [queueItem.userId],
    references: [user.id],
  }),
  pattern: one(pattern, {
    fields: [queueItem.patternId],
    references: [pattern.id],
  }),
  plannedStashItem: one(stashItem, {
    fields: [queueItem.plannedStashItemId],
    references: [stashItem.id],
  }),
}));
