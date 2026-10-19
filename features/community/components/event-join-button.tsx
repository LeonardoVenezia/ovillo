"use client";

import { UserMinus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { es } from "@/messages/es";

import type { ProjectOption } from "../event-queries";
import { joinEvent, leaveEvent } from "../event-actions";

/**
 * Sumarse a un KAL/CAL (spec §5.10): se elige un proyecto propio y se puede
 * cambiar o salir después. Solo lo ve quien integra el grupo con membresía
 * activa; la acción revalida igual (D-056).
 */
export function EventJoinButton({
  eventId,
  initialProjectId,
  projects,
}: {
  eventId: string;
  initialProjectId: string | null;
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [currentProjectId, setCurrentProjectId] = useState(initialProjectId);
  const [selected, setSelected] = useState(initialProjectId ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (projects.length === 0) {
    return (
      <div className="border-border bg-card flex flex-col items-start gap-3 rounded-2xl border p-4">
        <p className="text-sm">{es.community.events.noProjects}</p>
        <Button size="lg" variant="outline" asChild>
          <Link href="/mi-tejido/proyectos/nuevo">
            {es.community.events.createProjectCta}
          </Link>
        </Button>
      </div>
    );
  }

  const current = projects.find((item) => item.id === currentProjectId) ?? null;

  async function submit() {
    if (selected === "") {
      toast.error(es.community.events.joinHint);
      return;
    }
    setBusy(true);
    try {
      const result = await joinEvent({ eventId, projectId: selected });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        currentProjectId === null
          ? es.community.events.joined
          : es.community.events.changed,
      );
      setCurrentProjectId(selected);
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      const result = await leaveEvent({ eventId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(es.community.events.left);
      setCurrentProjectId(null);
      setSelected("");
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (current && !editing) {
    return (
      <div
        className="border-border bg-card flex flex-wrap items-center gap-3 rounded-2xl border p-4"
        data-testid="event-joined"
      >
        <span className="text-sm">
          {es.community.events.joinHint}{" "}
          <span className="font-medium" data-testid="event-my-project">
            {current.name}
          </span>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          data-testid="event-change-project"
          onClick={() => {
            setSelected(current.id);
            setEditing(true);
          }}
        >
          {es.community.events.changeProjectCta}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          data-testid="event-leave-button"
          onClick={() => void leave()}
        >
          <UserMinus aria-hidden="true" />
          {es.community.events.leaveCta}
        </Button>
      </div>
    );
  }

  return (
    <div className="border-border bg-card flex flex-col gap-3 rounded-2xl border p-4">
      <label className="text-sm font-medium" htmlFor="event-project">
        {es.community.events.joinHint}
      </label>
      <select
        id="event-project"
        value={selected}
        data-testid="event-join-select"
        onChange={(event) => setSelected(event.target.value)}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-lg border px-2.5 text-base outline-none focus-visible:ring-3 md:text-sm"
      >
        <option value="">—</option>
        {projects.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          disabled={busy}
          data-testid="event-join-submit"
          onClick={() => void submit()}
        >
          {es.community.events.joinCta}
        </Button>
        {editing ? (
          <Button
            type="button"
            size="lg"
            variant="ghost"
            disabled={busy}
            onClick={() => setEditing(false)}
          >
            {es.community.events.form.cancel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
