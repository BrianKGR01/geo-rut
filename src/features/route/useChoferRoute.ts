"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reduceDelivery, type DeliveryEvent } from "@/features/delivery/reducer";
import { getRoute } from "@/features/routes/api";
import { uploadRouteStopImage } from "@/features/routes/routeStopImages";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { StopStatus } from "@/types/domain";
import {
  applyDeliveryResult,
  buildChoferRouteData,
  groupChoferStops,
  nextChoferStop,
  toAppData,
  type ChoferRouteData,
} from "./choferRouteMapping";
import { useChoferArrivalDetection } from "./useChoferArrivalDetection";
import { useChoferLegs } from "./useChoferLegs";

export type ChoferRouteStatus = "loading" | "ready" | "not-found" | "error";

interface PersistParams {
  status: StopStatus;
  note?: string;
  arrivedAt?: string;
  deliveredAt?: string;
}

/** Única forma en que el chofer escribe `route_stops` (RLS no permite un `update` directo). */
async function persistStopUpdate(supabase: SupabaseDb, routeStopId: string, params: PersistParams): Promise<void> {
  const { error } = await supabase.rpc("chofer_update_stop", {
    p_route_stop_id: routeStopId,
    p_status: params.status,
    p_note: params.note,
    p_arrived_at: params.arrivedAt,
    p_delivered_at: params.deliveredAt,
  });
  if (error) throw error;
}

const NOTE_DEBOUNCE_MS = 600;

/**
 * Lee y ejecuta la ruta activa del chofer contra Supabase: mismo contrato (stops/route + acciones
 * de intención) que la app usaba con `useAppStore`, para que los componentes de presentación de v1
 * (`RouteMap`, `StopListPanel`, `StopRow`, la tarjeta de entrega) casi no necesiten cambios. Las
 * transiciones se validan en el cliente con el mismo `reduceDelivery` de v1 (lógica pura) y recién
 * si son válidas se persisten con la RPC `chofer_update_stop`; si la escritura falla, se revierte
 * el cambio optimista (sin cola de reintentos todavía, ver `docs/PLAN_V2.md` §9).
 */
export function useChoferRoute(routeId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<ChoferRouteStatus>("loading");
  const [data, setData] = useState<ChoferRouteData | null>(null);
  const [userId, setUserId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // El estado inicial ya es "loading" (primera carga); `refresh` es quien lo vuelve a poner en ese
  // estado para un reintento manual, desde un manejador de evento (nunca desde este efecto).
  const load = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      setUserId(sessionData.session?.user.id);
      const route = await getRoute(supabase, routeId);
      if (!route) {
        setData(null);
        setStatus("not-found");
        return;
      }
      setData(buildChoferRouteData(route));
      setStatus("ready");
    } catch {
      setData(null);
      setStatus("error");
    }
  }, [supabase, routeId]);

  useEffect(() => {
    // Carga inicial de la ruta al montar/cambiar de `routeId`: `load` termina llamando a `setStatus`
    // recién después de `await`, no de forma síncrona, pero el linter no distingue eso al trazar la
    // función memoizada — mismo patrón de "fetch al montar" que documenta react.dev.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const refresh = useCallback(() => {
    setStatus("loading");
    setActionError(undefined);
    void load();
  }, [load]);

  const { legsCache, startPoint, calculating } = useChoferLegs(data);

  /** Valida la transición con el reductor de v1 y, si es válida, aplica el cambio + lo persiste. */
  const runEvent = useCallback(
    async (event: DeliveryEvent, routeStopId: string, persist: PersistParams): Promise<boolean> => {
      if (!data) return false;
      const result = reduceDelivery(toAppData(data), event);
      if (!result.ok) return false;
      clearTimeout(noteTimerRef.current);
      const previous = data;
      setData(applyDeliveryResult(data, result.data));
      setActionError(undefined);
      try {
        await persistStopUpdate(supabase, routeStopId, persist);
        return true;
      } catch {
        setData(previous);
        setActionError("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
        return false;
      }
    },
    [data, supabase],
  );

  const markArrived = useCallback(
    (stopId: string) => {
      const at = new Date().toISOString();
      return runEvent({ type: "ARRIVE", stopId, at }, stopId, { status: "delivering", arrivedAt: at });
    },
    [runEvent],
  );

  const markDelivered = useCallback(
    (stopId: string) => {
      const at = new Date().toISOString();
      const note = data?.stops.find((stop) => stop.id === stopId)?.note?.trim() ?? "";
      return runEvent({ type: "DELIVER", stopId, at }, stopId, { status: "delivered", deliveredAt: at, note });
    },
    [runEvent, data],
  );

  const undoStop = useCallback(
    (stopId: string) => {
      const at = new Date().toISOString();
      return runEvent({ type: "UNDO", stopId, at }, stopId, { status: "pending" });
    },
    [runEvent],
  );

  // Se aplica local al toque (para no perder texto) y se persiste con un pequeño debounce, mismo
  // criterio que el resto de la app para no golpear la red en cada tecla.
  const setNote = useCallback(
    (stopId: string, note: string) => {
      if (!data) return;
      const result = reduceDelivery(toAppData(data), { type: "SET_NOTE", stopId, note });
      if (!result.ok) return;
      setData(applyDeliveryResult(data, result.data));
      clearTimeout(noteTimerRef.current);
      noteTimerRef.current = setTimeout(() => {
        persistStopUpdate(supabase, stopId, { status: "delivering", note }).catch(() => {
          setActionError("No se pudo guardar la observación. Revisa tu conexión.");
        });
      }, NOTE_DEBOUNCE_MS);
    },
    [data, supabase],
  );

  useEffect(() => () => clearTimeout(noteTimerRef.current), []);

  const uploadPhoto = useCallback(
    async (stopId: string, file: File): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!userId) return { ok: false, message: "No se pudo identificar tu sesión. Recarga la página." };
      try {
        const image = await uploadRouteStopImage(supabase, {
          routeId,
          routeStopId: stopId,
          file,
          uploadedBy: userId,
          uploadedRole: "chofer",
        });
        setData((current) =>
          current
            ? {
                ...current,
                stops: current.stops.map((stop) => (stop.id === stopId ? { ...stop, images: [...stop.images, image] } : stop)),
              }
            : current,
        );
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "No se pudo subir la foto. Intenta de nuevo." };
      }
    },
    [supabase, routeId, userId],
  );

  const view = data ? { stops: data.stops, route: data.route, ...groupChoferStops(data), next: nextChoferStop(data) } : undefined;
  const nextPending = view?.next?.status === "pending" ? view.next : undefined;
  const { askStopId, dismissAsk } = useChoferArrivalDetection(nextPending, markArrived);

  return {
    status,
    view,
    error: actionError,
    legsCache,
    startPoint,
    calculating,
    askStopId,
    dismissAsk,
    refresh,
    markArrived,
    markDelivered,
    undoStop,
    setNote,
    uploadPhoto,
  };
}
