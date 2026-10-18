import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/**
 * Herramientas del inventario: agujas y ganchos (spec §5.7 y tabla `tool`
 * de §6). Cada persona lleva las suyas; son privadas como el cuaderno.
 *
 * La medida se guarda en milímetros (con dos decimales: 2.25, 3.5, 12.75) y
 * las equivalencias US/UK se resuelven al mostrarla (`features/tools/sizes.ts`),
 * no se guardan: la tabla de conversión es del sistema, no de cada fila.
 *
 * La vinculación herramienta ↔ proyecto (`project_tool` de §6) llega con el
 * inventario de lana (Fase 5); acá el inventario vive solo.
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

export const toolRelations = relations(tool, ({ one }) => ({
  user: one(user, {
    fields: [tool.userId],
    references: [user.id],
  }),
}));
