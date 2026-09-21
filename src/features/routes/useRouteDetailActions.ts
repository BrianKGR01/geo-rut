import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useGeoStore, waitForPosition } from "@/features/route/geoStore";
import { optimizePendingOrder } from "@/features/route/planRoute";
import { routingProviders } from "@/features/route/providers";
import type { StoreRecord } from "@/features/stores/api";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseDb } from "@/lib/supabase/types";
import {
  activateRoute as activateRouteApi,
  assignDriver as assignDriverApi,
  cancelRoute as cancelRouteApi,
  finishRoute as finishRouteApi,
  type RouteStopDetail,
  type RouteSummary,
  type RouteWithStops,
} from "./api";
import {
  addRouteStop,
  mergeRouteStopLiveStates,
  optimizedRouteOrder,
  removeRouteStop,
  reorderRouteStops,
  type RouteStopLiveState,
} from "./routeStops";
import { useRouteLiveStatus } from "./useRouteLiveStatus";

const POSITION_WAIT_MS = 8000;
/** Mínimo de tiendas pendientes para que "Optimizar ruta" tenga algo que reordenar. */
const MIN_PENDING_TO_OPTIMIZE = 2;
const NO_GPS_NOTICE = "No tengo tu ubicación: ordené partiendo de la primera tienda.";
const APPROXIMATE_NOTICE = "Ruta aproximada (sin conexión al servicio de rutas).";

/**
 * Estado + mutaciones de la pantalla de detalle de ruta (activar/finalizar/cancelar, asignar
 * chofer, agregar/quitar/reordenar tiendas). Separado del componente para que el JSX de
 * `RouteDetailScreen` se mantenga corto (ver docs/BUENAS_PRACTICAS.md, "componentes < 150 líneas").
 */
export function useRouteDetailActions(initialRoute: RouteWithStops, currentUserId: string) {
  const router = useRouter();
  const [route, setRoute] = useState(initialRoute);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeNotice, setOptimizeNotice] = useState<string>();

  // Seguimiento casi en tiempo real (docs/PLAN_V2.md §6): mientras la ruta está activa, refleja acá
  // "Ya llegué"/"Entregado" del chofer sin que el administrador tenga que recargar la pantalla.
  const applyLiveStates = useCallback((liveStates: RouteStopLiveState[]) => {
    setRoute((prev) => ({ ...prev, stops: mergeRouteStopLiveStates(prev.stops, liveStates) }));
  }, []);
  useRouteLiveStatus(route.id, route.status, applyLiveStates);

  const runStatusAction = async (action: (supabase: SupabaseDb) => Promise<RouteSummary>) => {
    setBusy(true);
    setError(undefined);
    try {
      const summary = await action(createClient());
      setRoute((prev) => ({ ...prev, ...summary }));
    } catch {
      setError("No se pudo actualizar la ruta. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await cancelRouteApi(createClient(), route.id, currentUserId);
      router.push("/admin");
    } catch {
      setError("No se pudo cancelar la ruta. Intenta de nuevo.");
      setBusy(false);
    }
  };

  const addStops = async (stores: StoreRecord[]) => {
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    try {
      const added: RouteStopDetail[] = [];
      for (const store of stores) {
        const stop = await addRouteStop(supabase, {
          routeId: route.id,
          storeId: store.id,
          name: store.name,
          lat: store.lat,
          lng: store.lng,
        });
        added.push({ ...stop, items: [], images: [] });
      }
      setRoute((prev) => ({ ...prev, stops: [...prev.stops, ...added] }));
    } catch {
      setError("No se pudieron agregar las tiendas. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const removeStop = async (stop: RouteStopDetail) => {
    setBusy(true);
    setError(undefined);
    try {
      await removeRouteStop(createClient(), stop.id, currentUserId);
      setRoute((prev) => ({ ...prev, stops: prev.stops.filter((existing) => existing.id !== stop.id) }));
    } catch {
      setError("No se pudo quitar la tienda. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const reorder = async (orderedIds: string[]) => {
    const previous = route.stops;
    const byId = new Map(previous.map((stop) => [stop.id, stop]));
    const reordered = orderedIds
      .map((id, index) => {
        const stop = byId.get(id);
        return stop ? { ...stop, position: index } : undefined;
      })
      .filter((stop): stop is RouteStopDetail => Boolean(stop));
    setRoute((prev) => ({ ...prev, stops: reordered }));
    try {
      await reorderRouteStops(createClient(), route.id, orderedIds);
    } catch {
      setRoute((prev) => ({ ...prev, stops: previous }));
      setError("No se pudo guardar el nuevo orden. Intenta de nuevo.");
    }
  };

  /**
   * "Optimizar ruta": recalcula el orden de las tiendas `pending` desde la ubicación actual del
   * administrador y reusa `reorder` para aplicarlo (mismo camino optimista + persistencia que el
   * reorden a mano, ver docs/DECISIONS.md). Entregadas y en curso no se tocan.
   */
  const optimize = async () => {
    const pendingCount = route.stops.filter((stop) => stop.status === "pending").length;
    if (pendingCount < MIN_PENDING_TO_OPTIMIZE) return;
    setOptimizing(true);
    setOptimizeNotice(undefined);
    // Se llama dentro del gesto del usuario: aquí el navegador puede pedir el permiso de ubicación.
    useGeoStore.getState().start();
    const gps = await waitForPosition(POSITION_WAIT_MS);
    const pending = route.stops.filter((stop) => stop.status === "pending");
    const result = await optimizePendingOrder(pending, gps, routingProviders);
    await reorder(optimizedRouteOrder(route.stops, result.stopIds));
    const notices = [!gps && NO_GPS_NOTICE, result.approximate && APPROXIMATE_NOTICE].filter(Boolean) as string[];
    setOptimizeNotice(notices.length > 0 ? notices.join(" ") : undefined);
    setOptimizing(false);
  };

  /**
   * Aplica un cambio ya confirmado en Supabase (monto/partidas/fotos del pedido) al estado local,
   * sin volver a pedir toda la ruta: cada mutación de `OrderSheet` ya devuelve el dato fresco.
   */
  const updateStopDetail = (stopId: string, patch: Partial<RouteStopDetail>) => {
    setRoute((prev) => ({
      ...prev,
      stops: prev.stops.map((stop) => (stop.id === stopId ? { ...stop, ...patch } : stop)),
    }));
  };

  return {
    route,
    busy,
    error,
    activate: () => runStatusAction((supabase) => activateRouteApi(supabase, route.id)),
    finish: () => runStatusAction((supabase) => finishRouteApi(supabase, route.id)),
    assignDriver: (driverId: string | null) => runStatusAction((supabase) => assignDriverApi(supabase, route.id, driverId)),
    cancel,
    addStops,
    removeStop,
    reorder,
    optimize,
    optimizing,
    optimizeNotice,
    updateStopDetail,
  };
}
