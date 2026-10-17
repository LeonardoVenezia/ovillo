/**
 * Fechas de proyectos, en español y sin sorpresas de zona horaria.
 *
 * Las columnas `date` (inicio, terminado) llegan como `YYYY-MM-DD` y se
 * formatean en UTC para que el día no cambie según dónde se mire.
 */

const longFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatProjectDate(value: Date | string): string {
  const date =
    typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return longFormatter.format(date);
}

export function formatProjectShortDate(value: Date | string): string {
  const date =
    typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return shortFormatter.format(date);
}
