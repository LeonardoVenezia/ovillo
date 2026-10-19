import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { es } from "@/messages/es";

import type { PublicCollection } from "../queries";

/**
 * Sección "Guardados" del perfil público (spec §5.2 y §5.8): las colecciones
 * públicas de la persona con sus destinos públicos. Si no hay ninguna (o
 * quedaron vacías), no ocupa lugar.
 */
export function ProfileCollections({
  collections,
}: {
  collections: PublicCollection[];
}) {
  return (
    <section
      className="flex flex-col gap-3"
      data-testid="profile-collections"
    >
      <h2 className="font-heading text-lg font-semibold">
        {es.saved.publicTitle}
      </h2>

      {collections.map((collection) => (
        <div
          key={collection.id}
          className="border-border bg-card flex flex-col gap-2 rounded-2xl border p-4"
          data-testid="profile-collection"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-base font-semibold">
              {collection.name}
            </h3>
            <Badge variant="secondary">{collection.items.length}</Badge>
          </div>
          <ul className="flex flex-col gap-2">
            {collection.items.map((item) => (
              <li
                key={`${item.type}:${item.id}`}
                className="flex flex-wrap items-baseline gap-2 text-sm"
              >
                <Badge variant="outline">
                  {es.saved.typeLabels[item.type]}
                </Badge>
                <Link
                  href={item.href}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
                {item.subtitle ? (
                  <span className="text-muted-foreground">
                    {item.subtitle}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
