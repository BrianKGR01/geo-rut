import { optimizeOpenPath } from "@/lib/routing/optimizer";
import type { RoutingProvider } from "@/lib/routing/types";
import type { LatLng, LegsCache, RouteData, Stop } from "@/types/domain";
import { groupStops } from "./selectors";

export interface Providers {
  primary: RoutingProvider;
  /** Respaldo sin red (haversine). No debe fallar. */
  fallback: RoutingProvider;
}

/**
 * Desde dónde se dibuja la ruta pendiente: lo más reciente entre el punto de partida capturado
 * y la última tienda entregada (se presume que el repartidor sigue ahí).
 */
export function routeOrigin(data: RouteData): LatLng | undefined {
  const { startPoint } = data.route;
  const lastDelivered = data.stops
    .filter((stop) => stop.status === "delivered" && stop.deliveredAt)
    .sort((a, b) => (a.deliveredAt ?? "").localeCompare(b.deliveredAt ?? ""))
    .at(-1);
  if (!lastDelivered) return startPoint;
  if (startPoint && startPoint.capturedAt > (lastDelivered.deliveredAt ?? "")) return startPoint;
  return { lat: lastDelivered.lat, lng: lastDelivered.lng };
}

const pointKey = (point: LatLng) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;

/** Identifica puntos + orden; si no cambia, no hay nada que recalcular. */
export function routeKey(origin: LatLng | undefined, stops: Stop[]): string {
  return [origin ? pointKey(origin) : "-", ...stops.map((stop) => `${stop.id}@${pointKey(stop)}`)].join("|");
}

export interface RouteRequest {
  key: string;
  origin?: LatLng;
  stops: Stop[];
}

/** La ruta que hay que tener calculada para el estado actual, o `null` si no hay nada que dibujar. */
export function currentRouteRequest(data: RouteData): RouteRequest | null {
  const { remaining } = groupStops(data);
  const origin = routeOrigin(data);
  if (remaining.length + (origin ? 1 : 0) < 2) return null;
  return { key: routeKey(origin, remaining), origin, stops: remaining };
}

/** Calcula la ruta en el orden EXACTO recibido; si el servicio falla, líneas rectas y `approximate`. */
export async function computeLegsCache(request: RouteRequest, providers: Providers): Promise<LegsCache> {
  const points: LatLng[] = [...(request.origin ? [request.origin] : []), ...request.stops];
  const base = {
    key: request.key,
    stopIds: request.stops.map((stop) => stop.id),
    hasOrigin: request.origin !== undefined,
  };
  try {
    return { ...base, ...(await providers.primary.getRoute(points)), approximate: false };
  } catch {
    return { ...base, ...(await providers.fallback.getRoute(points)), approximate: true };
  }
}

export interface OptimizedOrder {
  stopIds: string[];
  approximate: boolean;
}

/**
 * Mejor orden para las tiendas `pending`. Con `origin` se parte de ahí; sin ubicación,
 * la primera tienda del orden actual queda fija como inicio (PRD RF-6).
 */
export async function optimizePendingOrder(
  pending: Stop[],
  origin: LatLng | undefined,
  providers: Providers,
): Promise<OptimizedOrder> {
  if (pending.length < 2) return { stopIds: pending.map((stop) => stop.id), approximate: false };
  const points: LatLng[] = origin ? [origin, ...pending] : pending;
  let matrix: number[][];
  let approximate = false;
  try {
    matrix = await providers.primary.getMatrix(points);
  } catch {
    matrix = await providers.fallback.getMatrix(points);
    approximate = true;
  }
  const order = optimizeOpenPath(matrix);
  const indices = origin ? order.map((node) => node - 1) : [0, ...order];
  const stopIds = indices.flatMap((index) => pending[index]?.id ?? []);
  return { stopIds, approximate };
}

/** Tramo que llega a cada tienda, según la última ruta calculada. */
export function legByStopId(cache: LegsCache | undefined): Map<string, LegsCache["legs"][number]> {
  const map = new Map<string, LegsCache["legs"][number]>();
  if (!cache) return map;
  cache.stopIds.forEach((id, index) => {
    const leg = cache.legs[cache.hasOrigin ? index : index - 1];
    if (leg) map.set(id, leg);
  });
  return map;
}

export function routeTotals(cache: LegsCache | undefined) {
  const legs = cache?.legs ?? [];
  return {
    distanceM: legs.reduce((sum, leg) => sum + leg.distanceM, 0),
    durationS: legs.reduce((sum, leg) => sum + leg.durationS, 0),
  };
}
