"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveCounterCount } from "../actions";
import { clampCounterCount, resolveSyncState } from "../schemas";

/**
 * Contador local-first (spec §5.4: "funciona offline y sincroniza al volver
 * la conexión"; D-035).
 *
 * Cada toque suma en el teléfono al instante y queda guardado en
 * `localStorage` con la versión en la que se apoya. Un ratito después (y al
 * volver la conexión) se manda al servidor con `saveCounterCount`. Si la
 * versión del servidor ya avanzó (otra sesión), gana el servidor y la
 * pantalla lo avisa.
 *
 * El service worker (PWA) llega en la Fase 8: por ahora el contador anduvo
 * sin conexión mientras la pestaña siga abierta, y los cambios pendientes
 * sobreviven a un recargado cuando la página vuelve a cargar.
 */

export type CounterSyncStatus = "synced" | "saving" | "pending" | "conflict";

type StoredCounter = { count: number; version: number; dirty: boolean };

const STORAGE_PREFIX = "ovillo:contador:";
/** Espera después del último toque antes de mandar al servidor. */
const SYNC_DELAY_MS = 700;
/** Reintento mientras siga habiendo cambios pendientes. */
const RETRY_MS = 5000;

function readStored(counterId: string): StoredCounter | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + counterId);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<StoredCounter>;
    if (
      typeof parsed.count !== "number" ||
      typeof parsed.version !== "number" ||
      typeof parsed.dirty !== "boolean"
    ) {
      return null;
    }
    return {
      count: parsed.count,
      version: parsed.version,
      dirty: parsed.dirty,
    };
  } catch {
    return null;
  }
}

function writeStored(counterId: string, value: StoredCounter): void {
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + counterId,
      JSON.stringify(value),
    );
  } catch {
    // Sin almacenamiento (modo privado, cuota): se sigue contando en memoria.
  }
}

/** Limpia lo guardado de un contador (al sincronizar o al eliminarlo). */
export function clearCounterStorage(counterId: string): void {
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + counterId);
  } catch {
    // Nada que limpiar.
  }
}

export function useCounterSync({
  counterId,
  initialCount,
  initialVersion,
}: {
  counterId: string;
  initialCount: number;
  initialVersion: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [version, setVersion] = useState(initialVersion);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<CounterSyncStatus>("synced");
  const [conflict, setConflict] = useState(false);

  // Los valores frescos viajan en un ref: los callbacks de red los leen
  // cuando responden, sin quedar atados a un render viejo. El ref se
  // actualiza en un efecto (nunca durante el render).
  const stateRef = useRef({
    count: initialCount,
    version: initialVersion,
    dirty: false,
  });
  useEffect(() => {
    stateRef.current = { count, version, dirty };
  }, [count, version, dirty]);
  const initialRef = useRef({ count: initialCount, version: initialVersion });
  const inFlight = useRef(false);
  // Cada toque sube esta marca: si un guardado viejo responde después de un
  // toque nuevo, no pisa lo que la persona acabó de contar.
  const opSeq = useRef(0);

  const syncNow = useCallback(async () => {
    const current = stateRef.current;
    if (!current.dirty || inFlight.current) {
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("pending");
      return;
    }

    const requestSeq = opSeq.current;
    inFlight.current = true;
    setStatus("saving");
    try {
      const result = await saveCounterCount({
        id: counterId,
        count: current.count,
        baseVersion: current.version,
      });
      if (!result.ok) {
        // El contador ya no existe (o la sesión venció): no insistir.
        setDirty(false);
        setStatus("synced");
        clearCounterStorage(counterId);
        return;
      }

      if (result.conflict) {
        // Otra sesión ganó: el servidor manda y la pantalla lo avisa.
        setCount(result.count);
        setVersion(result.version);
        setDirty(false);
        setConflict(true);
        setStatus("conflict");
        writeStored(counterId, {
          count: result.count,
          version: result.version,
          dirty: false,
        });
        return;
      }

      setVersion(result.version);
      if (opSeq.current === requestSeq) {
        setCount(result.count);
        setDirty(false);
        setStatus("synced");
        // El registro local queda como "último estado sincronizado": si una
        // página llega con datos viejos (prefetch), este registro la corrige.
        writeStored(counterId, {
          count: result.count,
          version: result.version,
          dirty: false,
        });
      } else {
        // Hubo toques mientras se guardaba: quedan pendientes para el
        // próximo envío (ya con la versión nueva como base).
        setStatus("saving");
      }
    } catch {
      // Sin conexión o el servidor no respondió: se reintenta solo.
      setStatus("pending");
    } finally {
      inFlight.current = false;
    }
  }, [counterId]);

  // Al montar: lo guardado local se compara con lo que trae la página. Si
  // había cambios pendientes, se retoman (misma versión) o se acepta lo del
  // servidor y se avisa (otra sesión). Y si el registro local es más nuevo
  // que la página (por ejemplo, la página llegó por un prefetch viejo), manda
  // el local: así la lista nunca muestra un conteo atrasado (D-035).
  useEffect(() => {
    const stored = readStored(counterId);
    if (!stored) {
      return;
    }
    const resolved = resolveSyncState(stored, initialRef.current);
    setCount(resolved.count);
    setVersion(resolved.version);
    if (resolved.dirty) {
      setDirty(true);
      setStatus("pending");
    }
    if (resolved.conflict) {
      setConflict(true);
      setStatus("conflict");
    }
    writeStored(counterId, {
      count: resolved.count,
      version: resolved.version,
      dirty: resolved.dirty,
    });
  }, [counterId]);

  // Con cambios pendientes: se persisten localmente y se programa el envío.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    writeStored(counterId, { count, version, dirty: true });
    const timer = window.setTimeout(() => void syncNow(), SYNC_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [counterId, count, dirty, syncNow, version]);

  // Reintentos, reconexión y volver a la pestaña.
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const retry = window.setInterval(() => void syncNow(), RETRY_MS);
    const onOnline = () => void syncNow();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncNow();
      }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(retry);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dirty, syncNow]);

  const change = useCallback((delta: number) => {
    opSeq.current += 1;
    setCount((value) => clampCounterCount(value + delta));
    setDirty(true);
    setConflict(false);
    setStatus(navigator.onLine ? "saving" : "pending");
  }, []);

  const press = useCallback(() => change(1), [change]);
  const subtract = useCallback(() => change(-1), [change]);

  const reset = useCallback(() => {
    opSeq.current += 1;
    setCount(0);
    setDirty(true);
    setConflict(false);
    setStatus(navigator.onLine ? "saving" : "pending");
  }, []);

  const dismissConflict = useCallback(() => {
    setConflict(false);
    setStatus("synced");
  }, []);

  return {
    count,
    status,
    conflict,
    dismissConflict,
    press,
    subtract,
    reset,
  };
}
