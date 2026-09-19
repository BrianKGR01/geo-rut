import type { AppData, OrderMode, StartPoint } from "@/types/domain";
import { groupStops } from "./selectors";

/**
 * Reemplaza el orden de las tiendas no entregadas. Las entregadas conservan su lugar al inicio.
 * Ids desconocidos se ignoran y los que falten se agregan al final: nunca se pierde una tienda.
 */
function withRemainingOrder(data: AppData, remainingIds: string[], orderMode: OrderMode): AppData {
  const { delivered, remaining } = groupStops(data);
  const valid = new Set(remaining.map((stop) => stop.id));
  const ordered = [...new Set(remainingIds)].filter((id) => valid.has(id));
  const missing = remaining.map((stop) => stop.id).filter((id) => !ordered.includes(id));
  return {
    ...data,
    route: {
      ...data.route,
      orderMode,
      stopOrder: [...delivered.map((stop) => stop.id), ...ordered, ...missing],
    },
  };
}

/** Reorden a mano: el orden se respeta tal cual y no se vuelve a optimizar solo. */
export function reorderManually(data: AppData, remainingIds: string[]): AppData {
  return withRemainingOrder(data, remainingIds, "manual");
}

/** Aplica el resultado de "Optimizar ruta": la que se está entregando va primero, luego las pendientes optimizadas. */
export function applyOptimizedOrder(
  data: AppData,
  pendingIds: string[],
  startPoint: StartPoint | undefined,
): AppData {
  const delivering = groupStops(data).remaining.filter((stop) => stop.status === "delivering");
  const next = withRemainingOrder(data, [...delivering.map((stop) => stop.id), ...pendingIds], "optimized");
  return { ...next, route: { ...next.route, startPoint: startPoint ?? next.route.startPoint } };
}
