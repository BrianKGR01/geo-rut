export type StopStatus = "pending" | "delivering" | "delivered";
export type CoordsSource = "link-exact" | "link-approx" | "geocoded" | "manual";
export type RouteStatus = "draft" | "active" | "finished";
export type OrderMode = "optimized" | "manual";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface OrderItem {
  id: string;
  description: string;
  quantity: number;
}

export interface Stop extends LatLng {
  id: string;
  name: string;
  coordsSource: CoordsSource;
  sourceUrl?: string;
  status: StopStatus;
  note?: string;
  orderItems: OrderItem[];
  arrivedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface RouteLeg {
  distanceM: number;
  durationS: number;
}

/** Última ruta calculada; `key` identifica los puntos y el orden con que se calculó. */
export interface LegsCache {
  key: string;
  stopIds: string[];
  hasOrigin: boolean;
  /** Polilínea codificada (precisión 5). */
  geometry: string;
  legs: RouteLeg[];
  approximate: boolean;
}

export interface StartPoint extends LatLng {
  capturedAt: string;
}

export interface RoutePlan {
  status: RouteStatus;
  stopOrder: string[];
  orderMode: OrderMode;
  startPoint?: StartPoint;
  currentTargetId?: string;
  legsCache?: LegsCache;
  startedAt?: string;
  finishedAt?: string;
}

export type ThemeMode = "auto" | "light" | "dark";
/** De dónde parte la ruta: la ubicación actual del celular o un punto fijo guardado. */
export type StartMode = "gps" | "fixed";

export interface FixedStart extends LatLng {
  label: string;
}

/** Preferencias que sobreviven a "Nueva ruta". */
export interface Settings {
  theme: ThemeMode;
  startMode: StartMode;
  fixedStart?: FixedStart;
}

export interface AppData {
  stops: Stop[];
  route: RoutePlan;
  settings: Settings;
}

/** Lo que necesita la lógica de ruta; así no depende de los ajustes. */
export type RouteData = Pick<AppData, "stops" | "route">;
