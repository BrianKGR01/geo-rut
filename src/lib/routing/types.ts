import type { LatLng, RouteLeg } from "@/types/domain";

export interface RouteResult {
  /** Polilínea codificada (precisión 5). */
  geometry: string;
  /** Un tramo por cada par consecutivo de puntos. */
  legs: RouteLeg[];
}

/** Proveedor de ruteo intercambiable (OSRM hoy; cualquier otro mañana). */
export interface RoutingProvider {
  /** Matriz de duraciones en segundos: `matrix[i][j]` = ir de `points[i]` a `points[j]`. */
  getMatrix(points: LatLng[]): Promise<number[][]>;
  /** Ruta que visita los puntos en el orden EXACTO recibido. */
  getRoute(orderedPoints: LatLng[]): Promise<RouteResult>;
}
