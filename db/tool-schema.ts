import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { project } from "./project-schema";

/**
 * Herramientas del inventario: agujas y ganchos (spec §5.7 y tablas `tool` y
 * `project_tool` de §6). Cada persona lleva las suyas; son privadas como el
 * cuaderno.
 *
 * La medida se guarda en milímetros (con dos decimales: 2.25, 3.5, 12.75) y
 * las equivalencias US/UK se resuelven al mostrarla (`features/tools/sizes.ts`),
 * no se guardan: la tabla de conversión es del sistema, no de cada fila.
 *
 * `project_tool` es qué agujas o ganchos lleva un proyecto (spec §5.3); no
 * descuenta nada del inventario (una herramienta sirve para varias cosas a
 * la vez), es información del proyecto. Al borrar la herramienta, su vínculo
 * se va con ella (cascade).
 */

export const TOOL_KINDS = [
  "rectas",
  "circulares",
  "doble-punta",
  "gancho",
] as const;

export type ToolKind = (typeof TOOL_KINDS)[number];

export function isToolKind(value: string): value is ToolKind {
  return (TOOL_KINDS as readonly string[]).includes(value);
}

export const TOOL_MATERIALS = [
  "aluminio",
  "acero",
  "madera",
  "bambu",
  "plastico",
  "resina",
  "fibra-de-carbono",
  "otro",
] as const;

export type ToolMaterial = (typeof TOOL_MATERIALS)[number];

export function isToolMaterial(value: string): value is ToolMaterial {
  return (TOOL_MATERIALS as readonly string[]).includes(value);
}

export const tool = pgTable(
  "tool",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ToolKind>().notNull(),
    /** Diámetro en milímetros; el tope y el paso los valida `schemas.ts`. */
    sizeMm: numeric("size_mm", {
      precision: 5,
      scale: 2,
      mode: "number",
    }).notNull(),
    material: text("material").$type<ToolMaterial>(),
    /** Largo del cable en cm: solo tiene sentido en las circulares. */
    lengthCm: integer("length_cm"),
    quantity: integer("quantity").notNull().default(1),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("tool_user_idx").on(table.userId, table.sizeMm)],
);

export const projectTool = pgTable(
  "project_tool",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    toolId: text("tool_id")
      .notNull()
      .references(() => tool.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("project_tool_project_idx").on(table.projectId),
    // Una herramienta se vincula una sola vez por proyecto.
    uniqueIndex("project_tool_project_tool_unique").on(
      table.projectId,
      table.toolId,
    ),
  ],
);

export const toolRelations = relations(tool, ({ one }) => ({
  user: one(user, {
    fields: [tool.userId],
    references: [user.id],
  }),
}));

export const projectToolRelations = relations(projectTool, ({ one }) => ({
  project: one(project, {
    fields: [projectTool.projectId],
    references: [project.id],
  }),
  tool: one(tool, {
    fields: [projectTool.toolId],
    references: [tool.id],
  }),
}));
