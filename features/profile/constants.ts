/**
 * Constantes del perfil (spec §5.1 y §5.2).
 *
 * Los slugs de técnicas y los códigos de país se guardan tal cual en la
 * base: son datos, no identificadores de código.
 */

export const CRAFT_SLUGS = ["dos-agujas", "crochet", "telar", "otras"] as const;

export type Craft = (typeof CRAFT_SLUGS)[number];

export function isCraft(value: string): value is Craft {
  return (CRAFT_SLUGS as readonly string[]).includes(value);
}

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export function isSkillLevel(value: string): value is SkillLevel {
  return (SKILL_LEVELS as readonly string[]).includes(value);
}
