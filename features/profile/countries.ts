/**
 * Países para el perfil (spec §5.1: "país/región, que define el vocabulario
 * preferido del glosario").
 *
 * El código es ISO 3166-1 alfa-2; "OT" es la salida para cualquier otro
 * país. El orden de la lista es alfabético por nombre en español.
 */

export const COUNTRY_CODES = [
  "AR", // Argentina
  "BO", // Bolivia
  "CL", // Chile
  "CO", // Colombia
  "CR", // Costa Rica
  "CU", // Cuba
  "EC", // Ecuador
  "SV", // El Salvador
  "ES", // España
  "US", // Estados Unidos
  "GT", // Guatemala
  "HN", // Honduras
  "MX", // México
  "NI", // Nicaragua
  "OT", // Otro país
  "PA", // Panamá
  "PY", // Paraguay
  "PE", // Perú
  "PR", // Puerto Rico
  "DO", // República Dominicana
  "UY", // Uruguay
  "VE", // Venezuela
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export const COUNTRY_NAMES: Record<CountryCode, string> = {
  AR: "Argentina",
  BO: "Bolivia",
  CL: "Chile",
  CO: "Colombia",
  CR: "Costa Rica",
  CU: "Cuba",
  EC: "Ecuador",
  SV: "El Salvador",
  ES: "España",
  US: "Estados Unidos",
  GT: "Guatemala",
  HN: "Honduras",
  MX: "México",
  NI: "Nicaragua",
  OT: "Otro país",
  PA: "Panamá",
  PY: "Paraguay",
  PE: "Perú",
  PR: "Puerto Rico",
  DO: "República Dominicana",
  UY: "Uruguay",
  VE: "Venezuela",
};

export function isCountryCode(value: string): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}

export function countryName(value: string): string | null {
  return isCountryCode(value) ? COUNTRY_NAMES[value] : null;
}
