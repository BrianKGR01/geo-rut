import { useEffect, useMemo, useState } from "react";
import type { LatLng, LegsCache, StartPoint } from "@/types/domain";
import type { ChoferRouteData } from "./choferRouteMapping";
import { useGeoStore } from "./geoStore";
import { computeLegsCache, currentRouteRequest } from "./planRoute";
import { routingProviders } from "./providers";

const DEBOUNCE_MS = 600;

interface UseChoferLegsResult {
  legsCache: LegsCache | undefined;
  startPoint: StartPoint | undefined;
  calculating: boolean;
}

/**
 * Equivalente efímero de `useRoutePlanner` (v1) para el chofer: RLS no deja escribir
 * `routes.start_point`/`legs_cache` desde el cliente (`docs/PLAN_V2.md` §5), así que ninguno de los
 * dos se persiste — viven solo en este hook, recalculando con el mismo debounce y las mismas
 * funciones puras (`currentRouteRequest`/`computeLegsCache`) que ya existían.
 */
export function useChoferLegs(data: ChoferRouteData | null): UseChoferLegsResult {
  const [startPoint, setStartPoint] = useState<StartPoint>();
  const [legsCache, setLegsCache] = useState<LegsCache>();
  const [calculating, setCalculating] = useState(false);

  // Captura el punto de partida una sola vez (la primera posición GPS que llegue), igual que
  // `captureStartPoint` en v1: no se sigue la posición en vivo para no recalcular sin parar.
  useEffect(() => {
    if (startPoint) return;
    const capture = (position: LatLng | undefined) => {
      if (position) setStartPoint({ lat: position.lat, lng: position.lng, capturedAt: new Date().toISOString() });
    };
    capture(useGeoStore.getState().position);
    return useGeoStore.subscribe((state) => capture(state.position));
  }, [startPoint]);

  const request = useMemo(
    () => (data ? currentRouteRequest({ stops: data.stops, route: { ...data.route, startPoint } }) : null),
    [data, startPoint],
  );
  const requestKey = request?.key;

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setCalculating(true);
      const cache = await computeLegsCache(request, routingProviders);
      if (!cancelled) setLegsCache(cache);
      setCalculating(false);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Solo debe recalcular cuando cambia la clave (puntos+orden), no la identidad del objeto `request`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  // Sin pedido vigente (menos de 2 puntos) no hay ruta que mostrar; se deriva acá en vez de limpiar
  // `legsCache` con un `setState` extra dentro del efecto de arriba.
  return { legsCache: request ? legsCache : undefined, startPoint, calculating };
}
