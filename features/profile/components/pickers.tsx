"use client";

import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import {
  CRAFT_SLUGS,
  SKILL_LEVELS,
  type Craft,
  type SkillLevel,
} from "../constants";
import { COUNTRY_CODES, COUNTRY_NAMES } from "../countries";

/**
 * Selectores del perfil, compartidos por la bienvenida y Configuración.
 * Botones con aria-pressed en vez de listas nativas: en el celular entran
 * cómodos y dejan elegir con un toque (44px de alto mínimo).
 */

const chipStyles =
  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const chipSelected = "border-primary bg-primary/10 font-medium";
const chipIdle = "border-border hover:bg-muted";

export function CraftChips({
  value,
  onChange,
}: {
  value: Craft[];
  onChange: (next: Craft[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CRAFT_SLUGS.map((slug) => {
        const selected = value.includes(slug);
        return (
          <button
            key={slug}
            type="button"
            aria-pressed={selected}
            className={cn(chipStyles, selected ? chipSelected : chipIdle)}
            onClick={() =>
              onChange(
                selected
                  ? value.filter((craft) => craft !== slug)
                  : [...value, slug],
              )
            }
          >
            {es.profile.craftLabels[slug]}
          </button>
        );
      })}
    </div>
  );
}

export function SkillPicker({
  value,
  onChange,
  allowEmpty = false,
}: {
  value: SkillLevel | "";
  onChange: (next: SkillLevel | "") => void;
  allowEmpty?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowEmpty ? (
        <button
          type="button"
          aria-pressed={value === ""}
          className={cn(chipStyles, value === "" ? chipSelected : chipIdle)}
          onClick={() => onChange("")}
        >
          {es.profile.levelNone}
        </button>
      ) : null}
      {SKILL_LEVELS.map((level) => {
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={selected}
            className={cn(chipStyles, selected ? chipSelected : chipIdle)}
            onClick={() => onChange(level)}
          >
            {es.profile.skillLabels[level]}
          </button>
        );
      })}
    </div>
  );
}

export function CountrySelect({
  id,
  value,
  onChange,
  emptyLabel,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  /** Texto de la opción vacía; sin esto, la primera opción es un pedido. */
  emptyLabel?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-lg border bg-transparent px-2.5 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm"
    >
      <option value="">{emptyLabel ?? es.onboarding.countryPlaceholder}</option>
      {COUNTRY_CODES.map((code) => (
        <option key={code} value={code}>
          {COUNTRY_NAMES[code]}
        </option>
      ))}
    </select>
  );
}
