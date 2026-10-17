import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

/**
 * Perfil de la persona (spec §6: `profile`, 1 a 1 con `user`).
 *
 * El estado "completo o no" se deduce de los datos (p. ej. `crafts` vacío):
 * no hace falta un campo extra de onboarding.
 */

/** Enlace externo del perfil. `kind` permite sumar tipos más adelante. */
export type ProfileLink = {
  kind: "instagram" | "tiktok" | "facebook" | "pinterest" | "web";
  url: string;
};

/** Visibilidad del perfil público (spec §6: default_visibility). */
export type ProfileVisibility = "publico" | "privado";

export const profile = pgTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  location: text("location"),
  /** Código ISO 3166-1 alfa-2 (ej. "AR"), o "OT" para "otro país". */
  country: text("country"),
  /** Técnicas que teje, como slugs en español (ej. "dos-agujas"). */
  crafts: text("crafts")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  skillLevel: text("skill_level"),
  links: jsonb("links")
    .$type<ProfileLink[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  defaultVisibility: text("default_visibility")
    .$type<ProfileVisibility>()
    .notNull()
    .default("publico"),
  theme: text("theme"),
  reduceMotion: boolean("reduce_motion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, {
    fields: [profile.userId],
    references: [user.id],
  }),
}));
