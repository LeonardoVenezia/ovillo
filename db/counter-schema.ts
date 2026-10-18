import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { project } from "./project-schema";

/**
 * Contadores de vueltas (spec §5.4 y tabla `row_counter` de §6).
 *
 * Cada proyecto puede tener varios ("cuerpo", "manga izq."). El contador se
 * cuenta en el teléfono y el servidor solo guarda el valor: `version` sube en
 * cada guardado y el cliente la manda de vuelta para resolver los cambios
 * hechos sin conexión (D-035).
 */

/** Tope del contador: el cliente lo respeta y el servidor lo vuelve a aplicar. */
export const COUNTER_COUNT_MAX = 99999;

export const rowCounter = pgTable(
  "row_counter",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    count: integer("count").notNull().default(0),
    /** Recordatorio cada N vueltas ("aumentar cada 6"); `null` = sin recordatorio. */
    repeatEvery: integer("repeat_every"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("row_counter_project_idx").on(table.projectId, table.createdAt),
  ],
);

export const rowCounterRelations = relations(rowCounter, ({ one }) => ({
  project: one(project, {
    fields: [rowCounter.projectId],
    references: [project.id],
  }),
}));
