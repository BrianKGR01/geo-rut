import type { AppData, FixedStart, LatLng, RoutePlan, Settings } from "@/types/domain";
import { routeOrigin } from "./planRoute";

/** Ruta nueva en borrador; con partida fija ya nace con su punto de partida. */
export function freshRoute(settings: Settings, at: string): RoutePlan {
  const base: RoutePlan = { status: "draft", stopOrder: [], orderMode: "manual" };
  if (settings.startMode !== "fixed" || !settings.fixedStart) return base;
  const { lat, lng } = settings.fixedStart;
  return { ...base, startPoint: { lat, lng, capturedAt: at } };
}

/** Partida fija (p. ej. el depósito). Queda guardada para las próximas rutas. */
export function chooseFixedStart(data: AppData, point: FixedStart, at: string): AppData {
  const settings: Settings = { ...data.settings, startMode: "fixed", fixedStart: point };
  if (data.route.status !== "draft") return { ...data, settings };
  const startPoint = { lat: point.lat, lng: point.lng, capturedAt: at };
  return { ...data, settings, route: { ...data.route, startPoint } };
}

/** Partida = donde esté el celular. Si aún no se conoce la posición, se captura más adelante. */
export function chooseGpsStart(data: AppData, position: LatLng | undefined, at: string): AppData {
  const settings: Settings = { ...data.settings, startMode: "gps" };
  if (data.route.status !== "draft") return { ...data, settings };
  const startPoint = position && { lat: position.lat, lng: position.lng, capturedAt: at };
  return { ...data, settings, route: { ...data.route, startPoint } };
}

/**
 * Desde dónde optimizar o iniciar AHORA. Antes de salir manda la partida elegida; con la ruta
 * en curso manda dónde está el repartidor (o, sin GPS, la última tienda entregada).
 */
export function plannedOrigin(data: AppData, gps: LatLng | undefined): LatLng | undefined {
  if (data.route.status === "active") return gps ?? routeOrigin(data);
  const { startMode, fixedStart } = data.settings;
  if (startMode === "fixed" && fixedStart) return { lat: fixedStart.lat, lng: fixedStart.lng };
  return gps;
}
