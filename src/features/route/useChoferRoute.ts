"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reduceDelivery, type DeliveryEvent } from "@/features/delivery/reducer";
import { getRoute } from "@/features/routes/api";
import type { RouteStopImage } from "@/features/routes/routeStopImages";
import { createClient } from "@/lib/supabase/client";
import {
  applyDeliveryResult,
  buildChoferRouteData,
  groupChoferStops,
  nextChoferStop,
  toAppData,
  type ChoferRouteData,
} from "./choferRouteMapping";
import { useGeoStore, waitForPosition } from "./geoStore";
import { optimizePendingOrder } from "./planRoute";
import { routingProviders } from "./providers";
import { useChoferArrivalDetection } from "./useChoferArrivalDetection";
import { useChoferLegs } from "./useChoferLegs";
import { reorderChoferStops, useChoferWriteQueue, type StopWriteParams } from "./useChoferWriteQueue";

export type ChoferRouteStatus = "loading" | "ready" | "not-found" | "error";

const NOTE_DEBOUNCE_MS = 600;

/**
 * Lee y ejecuta la ruta activa del chofer contra Supabase: mismo contrato (stops/route + acciones
 * de intención) que la app usaba con `useAppStore`, para que los componentes de presentación de v1
 * (`RouteMap`, `StopListPanel`, `StopRow`, la tarjeta de entrega) casi no necesiten cambios. Las
 * transiciones se validan en el cliente con el mismo `reduceDelivery` de v1 (lógica pura) y recién
 * si son válidas se aplican de forma optimista; la escritura real (RPC `chofer_update_stop`, subida
 * de fotos) queda a cargo de `useChoferWriteQueue`, que reintenta sola ante un corte de señal sin
 * perder el toque del usuario ni revertir el estado local (`docs/PLAN_V2.md` §9).
 */
export function useChoferRoute(routeId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<ChoferRouteStatus>("loading");
  const [data, setData] = useState<ChoferRouteData | null>(null);
  const [userId, setUserId] = useState<string>();
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string>();
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
    void load();
  }, [load]);

  const { legsCache, startPoint, calculating } = useChoferLegs(data);

  const handlePhotoSynced = useCallback((stopId: string, image: RouteStopImage) => {
    setData((current) =>
      current
        ? { ...current, stops: current.stops.map((stop) => (stop.id === stopId ? { ...stop, images: [...stop.images, image] } : stop)) }
        : current,
    );
  }, []);
  const handleAccessLost = useCallback(() => {
    // Mismo destino que `load()` cuando la ruta ya no se puede leer: la pantalla de "ya no tienes
    // acceso" (no hace falta esperar a que el chofer recargue para verla).
    setData(null);
    setStatus("not-found");
  }, []);
  const {
    retrying,
    droppedPhotoMessage,
    dismissDroppedPhotoMessage,
    persistStopWrite,
    uploadPhoto: queueUploadPhoto,
  } = useChoferWriteQueue(supabase, routeId, handlePhotoSynced, handleAccessLost);

  /**
   * Valida la transición con el reductor de v1 y, si es válida, aplica el cambio de forma
   * optimista. La escritura real nunca revierte el estado local ante un fallo de red: queda a
   * cargo de `persistStopWrite`, que reintenta y, si hace falta, encola (ver `useChoferWriteQueue`).
   */
  const runEvent = useCallback(
    async (event: DeliveryEvent, routeStopId: string, persist: StopWriteParams): Promise<boolean> => {
      if (!data) return false;
      const result = reduceDelivery(toAppData(data), event);
      if (!result.ok) return false;
      clearTimeout(noteTimerRef.current);
      setData(applyDeliveryResult(data, result.data));
      await persistStopWrite(routeStopId, persist);
      return true;
    },
    [data, persistStopWrite],
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
        void persistStopWrite(stopId, { status: "delivering", note });
      }, NOTE_DEBOUNCE_MS);
    },
    [data, persistStopWrite],
  );

  useEffect(() => () => clearTimeout(noteTimerRef.current), []);

  const uploadPhoto = useCallback(
    async (stopId: string, file: File): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!userId) return { ok: false, message: "No se pudo identificar tu sesión. Recarga la página." };
      const result = await queueUploadPhoto({ routeId, routeStopId: stopId, file, uploadedBy: userId, uploadedRole: "chofer" });
      if (!result.ok) return result;
      if (result.image) {
        const image = result.image;
        setData((current) =>
          current
            ? { ...current, stops: current.stops.map((stop) => (stop.id === stopId ? { ...stop, images: [...stop.images, image] } : stop)) }
            : current,
        );
      }
      return { ok: true };
    },
    [queueUploadPhoto, routeId, userId],
  );

  /**
   * Optimiza el orden de visita de las tiendas pendientes (RF-6), a pedido del chofer (botón
   * "Optimizar ruta"). Es una acción puntual, no encolada como `persistStopWrite`: si la RPC falla
   * no queda nada a medio aplicar (ver `docs/PLAN_V2.md` §9) — se avisa con `optimizeError` y el
   * chofer puede volver a tocar el botón. Las tiendas `delivered` nunca se tocan (la propia RPC las
   * excluye y las deja en su posición).
   */
  const optimizeStops = useCallback(async () => {
    if (!data) return;
    const { delivered, remaining } = groupChoferStops(data);
    const deliveringIds = remaining.filter((stop) => stop.status === "delivering").map((stop) => stop.id);
    const pending = remaining.filter((stop) => stop.status === "pending");
    if (pending.length < 2) return;
    setOptimizing(true);
    setOptimizeError(undefined);
    try {
      useGeoStore.getState().start();
      const position = await waitForPosition(8000);
      const origin = position ? { lat: position.lat, lng: position.lng } : undefined;
      const { stopIds: optimizedPendingIds } = await optimizePendingOrder(pending, origin, routingProviders);
      const orderedIds = [...deliveringIds, ...optimizedPendingIds];
      await reorderChoferStops(supabase, routeId, orderedIds);
      setData((current) =>
        current
          ? { ...current, route: { ...current.route, stopOrder: [...delivered.map((stop) => stop.id), ...orderedIds] } }
          : current,
      );
    } catch {
      setOptimizeError("No se pudo optimizar la ruta. Intenta de nuevo.");
    } finally {
      setOptimizing(false);
    }
  }, [data, supabase, routeId]);

  const view = data ? { stops: data.stops, route: data.route, ...groupChoferStops(data), next: nextChoferStop(data) } : undefined;
  const nextPending = view?.next?.status === "pending" ? view.next : undefined;
  const { askStopId, dismissAsk } = useChoferArrivalDetection(nextPending, markArrived);

  return {
    status,
    view,
    retrying,
    droppedPhotoMessage,
    dismissDroppedPhotoMessage,
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
    optimizing,
    optimizeError,
    optimizeStops,
  };
}
