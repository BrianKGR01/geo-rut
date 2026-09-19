import { groupStops } from "@/features/route/selectors";
import type { AppData, LatLng, RoutePlan, Stop } from "@/types/domain";

export type DeliveryEvent =
  | { type: "START_ROUTE"; at: string; startPoint?: LatLng }
  | { type: "GO_TO"; stopId: string }
  | { type: "ARRIVE"; stopId: string; at: string }
  | { type: "SET_NOTE"; stopId: string; note: string }
  | { type: "DELIVER"; stopId: string; at: string }
  | { type: "UNDO"; stopId: string; at: string };

export type RejectReason =
  | "STOP_NOT_FOUND"
  | "ROUTE_NOT_ACTIVE"
  | "ROUTE_ALREADY_STARTED"
  | "NOTHING_TO_DELIVER"
  | "INVALID_STOP_STATUS"
  | "ANOTHER_STOP_IN_PROGRESS";

export type ReduceResult = { ok: true; data: AppData } | { ok: false; reason: RejectReason };

const reject = (reason: RejectReason): ReduceResult => ({ ok: false, reason });
const NOTE_MAX = 500;

function replaceStop(data: AppData, stop: Stop, route: RoutePlan = data.route): AppData {
  return { stops: data.stops.map((item) => (item.id === stop.id ? stop : item)), route };
}

/**
 * Cierra o reabre la ruta según queden tiendas por entregar. Se usa después de cualquier cambio
 * que altere el conjunto de pendientes (entregar, deshacer, eliminar, agregar).
 */
export function settleRoute(data: AppData, at: string): AppData {
  const { delivered, remaining } = groupStops(data);
  const { route } = data;
  if (route.status !== "draft" && data.stops.length === 0) {
    // Se eliminaron todas las tiendas: no queda ruta que ejecutar.
    return { ...data, route: { status: "draft", stopOrder: [], orderMode: route.orderMode } };
  }
  if (route.status === "active" && remaining.length === 0 && delivered.length > 0) {
    return { ...data, route: { ...route, status: "finished", finishedAt: at, currentTargetId: undefined } };
  }
  if (route.status === "finished" && remaining.length > 0) {
    return { ...data, route: { ...route, status: "active", finishedAt: undefined } };
  }
  return data;
}

/**
 * Única puerta para cambiar `StopStatus` y `RoutePlan.status`. Transiciones válidas de una tienda:
 * pending → delivering → delivered, y delivering/delivered → pending (deshacer).
 * Solo puede haber una tienda `delivering` a la vez y solo con la ruta activa.
 */
export function reduceDelivery(data: AppData, event: DeliveryEvent): ReduceResult {
  if (event.type === "START_ROUTE") {
    if (data.route.status !== "draft") return reject("ROUTE_ALREADY_STARTED");
    if (groupStops(data).remaining.length === 0) return reject("NOTHING_TO_DELIVER");
    const startPoint = event.startPoint
      ? { lat: event.startPoint.lat, lng: event.startPoint.lng, capturedAt: event.at }
      : data.route.startPoint;
    return {
      ok: true,
      data: { ...data, route: { ...data.route, status: "active", startedAt: event.at, startPoint } },
    };
  }

  const stop = data.stops.find((item) => item.id === event.stopId);
  if (!stop) return reject("STOP_NOT_FOUND");

  if (event.type === "UNDO") {
    if (stop.status === "pending") return reject("INVALID_STOP_STATUS");
    const reverted: Stop = { ...stop, status: "pending", arrivedAt: undefined, deliveredAt: undefined };
    return { ok: true, data: settleRoute(replaceStop(data, reverted), event.at) };
  }

  if (data.route.status !== "active") return reject("ROUTE_NOT_ACTIVE");

  switch (event.type) {
    case "GO_TO":
      if (stop.status !== "pending") return reject("INVALID_STOP_STATUS");
      return { ok: true, data: { ...data, route: { ...data.route, currentTargetId: stop.id } } };

    case "ARRIVE": {
      if (stop.status !== "pending") return reject("INVALID_STOP_STATUS");
      if (data.stops.some((item) => item.status === "delivering")) return reject("ANOTHER_STOP_IN_PROGRESS");
      const arrived: Stop = { ...stop, status: "delivering", arrivedAt: event.at };
      // La que se está entregando pasa al frente: el orden refleja lo que de verdad ocurrió.
      const { delivered, remaining } = groupStops(data);
      const stopOrder = [
        ...delivered.map((item) => item.id),
        stop.id,
        ...remaining.filter((item) => item.id !== stop.id).map((item) => item.id),
      ];
      return { ok: true, data: replaceStop(data, arrived, { ...data.route, stopOrder, currentTargetId: stop.id }) };
    }

    case "SET_NOTE": {
      if (stop.status !== "delivering") return reject("INVALID_STOP_STATUS");
      const note = event.note.slice(0, NOTE_MAX);
      return { ok: true, data: replaceStop(data, { ...stop, note: note === "" ? undefined : note }) };
    }

    case "DELIVER": {
      if (stop.status !== "delivering") return reject("INVALID_STOP_STATUS");
      const note = stop.note?.trim();
      const done: Stop = { ...stop, status: "delivered", deliveredAt: event.at, note: note || undefined };
      const route = { ...data.route, currentTargetId: undefined };
      return { ok: true, data: settleRoute(replaceStop(data, done, route), event.at) };
    }
  }
}
