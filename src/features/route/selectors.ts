import type { AppData, Stop } from "@/types/domain";

/** Paradas en el orden de visita; las que falten en `stopOrder` van al final. */
export function orderedStops(data: AppData): Stop[] {
  const position = new Map(data.route.stopOrder.map((id, index) => [id, index]));
  const rank = (stop: Stop) => position.get(stop.id) ?? Number.MAX_SAFE_INTEGER;
  return [...data.stops].sort((a, b) => rank(a) - rank(b));
}

export interface StopGroups {
  delivered: Stop[];
  /** `delivering` + `pending`, en orden de visita. */
  remaining: Stop[];
}

export function groupStops(data: AppData): StopGroups {
  const ordered = orderedStops(data);
  return {
    delivered: ordered.filter((stop) => stop.status === "delivered"),
    remaining: ordered.filter((stop) => stop.status !== "delivered"),
  };
}

/** La tienda que toca ahora: la que se está entregando, el destino fijado o la primera pendiente. */
export function nextStop(data: AppData): Stop | undefined {
  const { remaining } = groupStops(data);
  return (
    remaining.find((stop) => stop.status === "delivering") ??
    remaining.find((stop) => stop.id === data.route.currentTargetId) ??
    remaining[0]
  );
}

export const STATUS_LABEL: Record<Stop["status"], string> = {
  pending: "Pendiente",
  delivering: "Entregando",
  delivered: "Entregado",
};
