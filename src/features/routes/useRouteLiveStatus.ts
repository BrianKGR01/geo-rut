"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RouteStatus } from "@/types/domain";
import { fetchRouteStopLiveStates, type RouteStopLiveState } from "./routeStops";

/** 10-15 s pedido por docs/PLAN_V2.md §6; 12 s cae en el medio del rango. */
const POLL_INTERVAL_MS = 12_000;

/**
 * Sondeo liviano de `route_stops` (docs/PLAN_V2.md §6) para que la pantalla de detalle del
 * administrador refleje "Ya llegué"/"Entregado" del chofer sin recargar y sin mantener una
 * conexión abierta (a pedido explícito del usuario: nada de Supabase Realtime). Solo pide mientras
 * `routeStatus === "active"` y la pestaña está visible (`visibilitychange`, mismo patrón que
 * `useGeolocationLifecycle` para el GPS); se corta del todo al desmontar o si la ruta deja de
 * estar activa (finalizada/cancelada) o cambia de `routeId`.
 *
 * No guarda estado propio: llama a `onUpdate` con cada ronda (patrón "suscribirse a un sistema
 * externo y llamar a setState en un callback" que recomienda la guía de Effects de React) para que
 * quien la usa decida cómo aplicar el resultado sobre su propio estado, sin duplicarlo acá.
 */
export function useRouteLiveStatus(
  routeId: string,
  routeStatus: RouteStatus,
  onUpdate: (states: RouteStopLiveState[]) => void,
): void {
  // Siempre la última función recibida, sin que dispare un nuevo montaje del sondeo si el llamador
  // la recrea en cada render (evita pedirle a quien usa el hook que la memoice con `useCallback`).
  // Se actualiza en un efecto (no durante el render) porque React no permite escribir un ref ahí.
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    if (routeStatus !== "active") return;

    const supabase = createClient();
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const data = await fetchRouteStopLiveStates(supabase, routeId);
        if (!cancelled) onUpdateRef.current(data);
      } catch {
        // Sin conexión momentánea: se reintenta en la próxima ronda, no rompe la pantalla.
      }
    };

    const startPolling = () => {
      if (timer) return;
      void poll();
      timer = setInterval(poll, POLL_INTERVAL_MS);
    };
    const stopPolling = () => {
      clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") startPolling();
      else stopPolling();
    };

    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [routeId, routeStatus]);
}
