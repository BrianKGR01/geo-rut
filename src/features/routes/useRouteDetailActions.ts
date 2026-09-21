import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { addRouteStop, removeRouteStop, reorderRouteStops } from "./routeStops";

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
    updateStopDetail,
  };
}
