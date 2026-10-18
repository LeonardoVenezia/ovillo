import { es } from "@/messages/es";

import { CROCHET_HOOK_SIZES, formatMm, KNITTING_NEEDLE_SIZES } from "../sizes";

/**
 * Tabla de equivalencias de numeración (spec §5.7): la referencia rápida de
 * mm ↔ US ↔ UK. Es contenido fijo (no toca la base), así que vive fuera de
 * cualquier `<Suspense>` y entra en el caparazón estático de la página.
 */

type Row = { mm: string; us: string | null; uk?: string | null };

export function EquivalenceTable() {
  const needleRows: Row[] = KNITTING_NEEDLE_SIZES.map((size) => ({
    mm: formatMm(size.mm),
    us: size.us,
    uk: size.uk,
  }));
  const hookRows: Row[] = CROCHET_HOOK_SIZES.map((size) => ({
    mm: formatMm(size.mm),
    us: size.us,
  }));

  return (
    <section className="flex flex-col gap-3" data-testid="equivalence-table">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold">
          {es.tools.equivalenceTitle}
        </h2>
        <p className="text-muted-foreground text-sm">
          {es.tools.equivalenceIntro}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SizeTable
          title={es.tools.equivalenceNeedles}
          columns={[es.tools.equivalenceMm, "US", "UK"]}
          rows={needleRows}
        />
        <SizeTable
          title={es.tools.equivalenceHooks}
          columns={[es.tools.equivalenceMm, "US"]}
          rows={hookRows}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        {es.tools.equivalenceNote}
      </p>
    </section>
  );
}

function SizeTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Row[];
}) {
  return (
    <div className="border-border overflow-hidden rounded-2xl border">
      <p className="bg-muted/50 border-border border-b px-3 py-2 text-sm font-medium">
        {title}
      </p>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-background sticky top-0">
            <tr className="border-border border-b">
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="text-muted-foreground px-3 py-2 text-left text-xs font-medium"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.mm} className="border-border border-b last:border-0">
                <td className="px-3 py-2 font-medium tabular-nums">{row.mm}</td>
                <td className="px-3 py-2 tabular-nums">{row.us ?? "—"}</td>
                {columns.length === 3 ? (
                  <td className="px-3 py-2 tabular-nums">{row.uk ?? "—"}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
