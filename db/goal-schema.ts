import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/**
 * Meta anual (spec §5.14 y tabla `yearly_goal` de §6): "Mi año tejiendo".
 *
 * Una fila por persona y año (`unique`). La meta es **opcional** y el
 * progreso no se guarda: se calcula al leer, contando los proyectos con
 * `finished_at` de ese año (D-053). El `unique` ya deja el índice por
 * `user_id` que pide §6 (prefijo izquierdo). El rango válido del objetivo
 * (1–200) vive en `features/goal/schemas.ts`.
 */

export const yearlyGoal = pgTable(
  "yearly_goal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    targetProjects: integer("target_projects").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("yearly_goal_user_year_unique").on(table.userId, table.year),
  ],
);

export const yearlyGoalRelations = relations(yearlyGoal, ({ one }) => ({
  user: one(user, {
    fields: [yearlyGoal.userId],
    references: [user.id],
  }),
}));
