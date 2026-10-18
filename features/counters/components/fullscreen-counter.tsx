"use client";

import { ArrowLeft, Bell, Minus, Plus, RotateCcw, Sun } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { es } from "@/messages/es";

import { isReminderDue } from "../schemas";
import { type CounterSyncStatus, useCounterSync } from "./use-counter-sync";

/**
 * Contador a pantalla completa (spec §5.4 y ruta `/contador/[id]` de §9):
 * botones enormes, recordatorio cada N vueltas, pantalla siempre encendida
 * (Wake Lock cuando el navegador lo permite) y conteo sin conexión (D-035).
 *
 * La pantalla se cubre con `fixed inset-0 z-50` para tapar la navegación de
 * la app: es el momento de tejer, no de navegar.
 */

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
};

type WakeLockCapableNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

export function FullscreenCounter({
  counter,
  project,
}: {
  counter: {
    id: string;
    name: string;
    count: number;
    version: number;
    repeatEvery: number | null;
  };
  project: { name: string; slug: string };
}) {
  const { count, status, conflict, dismissConflict, press, subtract, reset } =
    useCounterSync({
      counterId: counter.id,
      initialCount: counter.count,
      initialVersion: counter.version,
    });

  const [resetting, setResetting] = useState(false);
  const [dismissedReminderAt, setDismissedReminderAt] = useState<number | null>(
    null,
  );
  const [wakeLockOn, setWakeLockOn] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const previousCountRef = useRef(count);

  // Pantalla siempre encendida (si el navegador lo soporta).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }
    let cancelled = false;

    async function acquire() {
      try {
        const wakeLock = (navigator as WakeLockCapableNavigator).wakeLock;
        const sentinel = await wakeLock?.request("screen");
        if (cancelled) {
          await sentinel?.release().catch(() => undefined);
          return;
        }
        sentinelRef.current = sentinel ?? null;
        setWakeLockOn(Boolean(sentinel));
        sentinel?.addEventListener?.("release", () => setWakeLockOn(false));
      } catch {
        // Sin soporte o sin permiso: se sigue contando igual.
      }
    }

    void acquire();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinelRef.current?.release().catch(() => undefined);
      sentinelRef.current = null;
    };
  }, []);

  // Recordatorio: vibra y aparece al llegar a un múltiplo del "cada N".
  useEffect(() => {
    const previous = previousCountRef.current;
    previousCountRef.current = count;
    if (count > previous && isReminderDue(count, counter.repeatEvery)) {
      setDismissedReminderAt(null);
      navigator.vibrate?.(120);
    }
  }, [count, counter.repeatEvery]);

  // Con teclado (escritorio): flecha arriba suma, flecha abajo resta.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        press();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        subtract();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [press, subtract]);

  const reminderVisible =
    isReminderDue(count, counter.repeatEvery) && dismissedReminderAt !== count;

  const confirmReset = useCallback(() => {
    reset();
    setResetting(false);
  }, [reset]);

  return (
    <div
      className="bg-background fixed inset-0 z-50 flex flex-col"
      data-testid="counter-fullscreen"
    >
      <header className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Button asChild variant="ghost" size="lg" className="shrink-0 px-2">
          <Link
            href={`/mi-tejido/proyectos/${project.slug}`}
            aria-label={es.counters.exit}
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-medium">{counter.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {project.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {wakeLockOn ? (
            <Sun
              className="text-muted-foreground size-4"
              aria-label={es.counters.wakeLockOn}
            />
          ) : null}
          <SyncPill status={status} />
        </div>
      </header>

      {conflict ? (
        <div
          role="status"
          data-testid="counter-conflict"
          className="border-border bg-muted mx-3 mt-3 flex items-start gap-3 rounded-2xl border p-3"
        >
          <p className="flex-1 text-sm">
            {es.counters.syncConflict.replace("{count}", String(count))}
          </p>
          <Button size="sm" variant="ghost" onClick={dismissConflict}>
            {es.counters.conflictDismiss}
          </Button>
        </div>
      ) : null}

      {reminderVisible ? (
        <div
          role="status"
          data-testid="counter-reminder"
          className="border-primary/30 bg-primary/10 mx-3 mt-3 flex items-start gap-3 rounded-2xl border p-3"
        >
          <Bell aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{es.counters.reminderTitle}</p>
            <p className="text-muted-foreground text-sm">
              {es.counters.reminderBody
                .replace("{count}", String(count))
                .replace("{every}", String(counter.repeatEvery))}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissedReminderAt(count)}
          >
            {es.counters.reminderDismiss}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center gap-2 overflow-hidden px-4">
        <p
          data-testid="counter-value"
          className="font-heading text-[clamp(5.5rem,34vw,11rem)] leading-none font-semibold tabular-nums"
        >
          {count}
        </p>
        <p className="text-muted-foreground text-sm">
          {count === 1 ? es.counters.countOne : es.counters.countUnit}
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={press}
          aria-label={es.counters.add}
          data-testid="counter-add"
          className="bg-primary text-primary-foreground min-h-32 w-full rounded-3xl text-4xl font-semibold shadow-sm transition select-none active:scale-[0.99] sm:min-h-40"
        >
          <span className="flex items-center justify-center gap-3">
            <Plus aria-hidden="true" className="size-9" />1
          </span>
        </button>

        {resetting ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex-1 text-sm font-medium">
              {es.counters.resetConfirm}
            </p>
            <Button
              type="button"
              size="lg"
              variant="destructive"
              onClick={confirmReset}
              data-testid="counter-reset-yes"
            >
              {es.counters.resetYes}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              onClick={() => setResetting(false)}
            >
              {es.counters.resetNo}
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-14 flex-1"
              aria-label={es.counters.subtract}
              onClick={subtract}
              data-testid="counter-subtract"
            >
              <Minus aria-hidden="true" />
              <span aria-hidden="true">1</span>
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-14 flex-1"
              onClick={() => setResetting(true)}
              data-testid="counter-reset"
            >
              <RotateCcw aria-hidden="true" />
              {es.counters.resetCta}
            </Button>
          </div>
        )}

        <p className="text-muted-foreground text-center text-xs">
          {counter.repeatEvery
            ? `${es.counters.repeatLabel.toLowerCase()} ${counter.repeatEvery} ${es.counters.repeatSuffix} · ${es.counters.keyboardHint}`
            : es.counters.keyboardHint}
        </p>
      </div>
    </div>
  );
}

function SyncPill({ status }: { status: CounterSyncStatus }) {
  const label =
    status === "saving"
      ? es.counters.syncSaving
      : status === "pending"
        ? es.counters.syncPending
        : status === "conflict"
          ? es.counters.syncConflictShort
          : es.counters.syncSynced;

  return (
    <span
      role="status"
      data-testid="counter-sync"
      className={cn(
        "text-muted-foreground max-w-32 truncate text-end text-xs",
        status === "synced" && "opacity-60",
      )}
    >
      {label}
    </span>
  );
}
