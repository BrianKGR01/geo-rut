import { haversineMeters } from "@/lib/geo/haversine";
import type { LatLng } from "@/types/domain";
import { encodePolyline } from "./polyline";
import type { RoutingProvider } from "./types";

// Las calles no son líneas rectas: se infla la distancia y se asume velocidad urbana media.
export const DETOUR_FACTOR = 1.3;
export const URBAN_SPEED_MPS = 25 / 3.6;

export function estimateLeg(a: LatLng, b: LatLng) {
  const distanceM = haversineMeters(a, b) * DETOUR_FACTOR;
  return { distanceM, durationS: distanceM / URBAN_SPEED_MPS };
}

/** Respaldo sin red: matriz por haversine y líneas rectas. */
export const haversineProvider: RoutingProvider = {
  async getMatrix(points) {
    return points.map((from) => points.map((to) => estimateLeg(from, to).durationS));
  },
  async getRoute(orderedPoints) {
    return {
      geometry: encodePolyline(orderedPoints.map((point) => [point.lat, point.lng])),
      legs: orderedPoints.slice(1).map((point, index) => {
        const previous = orderedPoints[index];
        return previous ? estimateLeg(previous, point) : { distanceM: 0, durationS: 0 };
      }),
    };
  },
};
