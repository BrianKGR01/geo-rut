import { defaultSettings } from "@/lib/storage/schema";
import type { RouteStopDetail, RouteWithStops } from "@/features/routes/api";
import type { RouteStopImage } from "@/features/routes/routeStopImages";
import type { RouteStopItem } from "@/features/routes/routeStopItems";
import type { AppData, RoutePlan, Stop } from "@/types/domain";
import { groupStops, nextStop } from "./selectors";

/**
 * Tienda del árbol de ejecución (mismo `Stop` de v1) más su pedido. Reusar exactamente `Stop`
 * permite reaprovechar sin cambios las funciones puras que ya existían para la ejecución de rutas:
 * `groupStops`/`nextStop`/`STATUS_LABEL` (`features/route/selectors.ts`), `buildMarkers`
 * (`features/route/markers.ts`) y `reduceDelivery`/`evaluateArrival`.
 */
export interface ChoferStop extends Stop {
  /** Bs, múltiplo de 5; `null` = todavía sin cargar. */
  pedidoMonto: number | null;
  items: RouteStopItem[];
  images: RouteStopImage[];
}

export interface ChoferRouteData {
  stops: ChoferStop[];
  route: RoutePlan;
}

/**
 * `coordsSource` no existe en `route_stops` (vive en el catálogo `stores`) y ninguna pantalla del
 * chofer la muestra; queda fija en `"manual"` solo para que `ChoferStop` siga siendo un `Stop`
 * válido. `orderItems` (partidas de v1) tampoco aplica: las partidas reales viajan en `items`.
 */
function mapChoferStop(detail: RouteStopDetail): ChoferStop {
  return {
    id: detail.id,
    name: detail.name,
    lat: detail.lat,
    lng: detail.lng,
    coordsSource: "manual",
    status: detail.status,
    note: detail.note,
    orderItems: [],
    arrivedAt: detail.arrivedAt,
    deliveredAt: detail.deliveredAt,
    createdAt: detail.createdAt,
    pedidoMonto: detail.pedidoMonto,
    items: detail.items,
    images: detail.images,
  };
}

/**
 * Arma la vista de ejecución del chofer desde la ruta ya traída de Supabase. `stopOrder` sale del
 * `position` de cada tienda (ya ordenado por `getRoute`); no hay `currentTargetId` (la siguiente
 * tienda es siempre la primera pendiente en ese orden, el chofer no fija destino) ni
 * `legsCache`/`startPoint`: RLS no deja al chofer escribir `routes`, así que esos dos quedan como
 * estado efímero (no persistido) en `useChoferRoute`, nunca en este mapeo puro.
 */
export function buildChoferRouteData(route: RouteWithStops): ChoferRouteData {
  const stops = route.stops.map(mapChoferStop);
  return {
    stops,
    route: {
      status: route.status,
      stopOrder: stops.map((stop) => stop.id),
      orderMode: route.orderMode,
      startedAt: route.startedAt,
      finishedAt: route.finishedAt,
    },
  };
}

/** Forma que espera `reduceDelivery`; `settings` trae una rama (`START_ROUTE`) que el chofer nunca dispara. */
export function toAppData(data: ChoferRouteData): AppData {
  return { stops: data.stops, route: data.route, settings: defaultSettings() };
}

/**
 * Aplica el resultado de `reduceDelivery` sin dejar que decida el `status` de la ruta: en v1
 * `settleRoute` pasa la ruta a `finished` sola al entregar la última tienda, pero en v2 eso es
 * decisión exclusiva del administrador (RLS no deja escribir `routes` desde el cliente del chofer,
 * ver `docs/PLAN_V2.md` §5). Solo se toman `stops` (con el pedido intacto — el reductor solo hace
 * spread de cada `Stop`, nunca reconstruye el objeto, así que `pedidoMonto`/`items`/`images`
 * sobreviven aunque el tipo estático de `result.stops` sea `Stop[]`) y `stopOrder` (para que la
 * tienda que pasa a "Entregando" avance al frente, igual que en v1).
 */
export function applyDeliveryResult(current: ChoferRouteData, result: AppData): ChoferRouteData {
  return {
    stops: result.stops as ChoferStop[],
    route: { ...current.route, stopOrder: result.route.stopOrder },
  };
}

export interface ChoferStopGroups {
  delivered: ChoferStop[];
  remaining: ChoferStop[];
}

/**
 * `groupStops`/`nextStop` (v1) devuelven `Stop`, pero ambas solo filtran/ordenan el arreglo de
 * entrada sin reconstruir cada objeto: el pedido (`pedidoMonto`/`items`/`images`) sigue intacto en
 * runtime, así que acá se re-tipa a `ChoferStop` para que la UI del chofer no pierda esos campos.
 */
export function groupChoferStops(data: ChoferRouteData): ChoferStopGroups {
  return groupStops(data) as unknown as ChoferStopGroups;
}

export function nextChoferStop(data: ChoferRouteData): ChoferStop | undefined {
  return nextStop(data) as ChoferStop | undefined;
}
