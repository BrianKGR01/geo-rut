import { haversineMeters } from "@/lib/geo/haversine";
import type { LatLng } from "@/types/domain";
import type { UserPosition } from "@/types/map";

/** Radio dentro del cual se considera que el repartidor llegó a la tienda. */
export const ARRIVAL_RADIUS_M = 120;
/** Con peor precisión que esta no se marca la llegada sola: se pregunta. */
export const MAX_AUTO_ACCURACY_M = 150;

export type ArrivalVerdict = "arrived" | "ask" | "none";

/**
 * - `arrived`: GPS confiable y dentro del radio → pasar a "Entregando".
 * - `ask`: GPS impreciso, pero la tienda cae dentro del margen de error → preguntar al usuario.
 * - `none`: lejos, o sin datos.
 */
export function evaluateArrival(
  position: UserPosition | undefined,
  target: LatLng | undefined,
  radiusM: number = ARRIVAL_RADIUS_M,
): ArrivalVerdict {
  if (!position || !target) return "none";
  const distance = haversineMeters(position, target);
  if (position.accuracy <= MAX_AUTO_ACCURACY_M) return distance <= radiusM ? "arrived" : "none";
  return distance - position.accuracy <= radiusM ? "ask" : "none";
}
