import type { Metadata } from "next";

import { GroupForm } from "@/features/community/components/group-form";
import { emptyGroupValues } from "@/features/community/schemas";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.community.form.newTitle,
};

/**
 * Crear grupo (spec §5.9, `/grupos/nuevo`). Ruta privada: el proxy manda a
 * ingresar sin sesión y la acción revalida siempre.
 */
export default function NewGroupPage() {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {es.community.form.newTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {es.community.form.newIntro}
        </p>
      </div>

      <GroupForm
        mode="create"
        initial={emptyGroupValues}
        cancelHref="/comunidad"
      />
    </section>
  );
}
