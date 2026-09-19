import { z } from "zod";
import type { LatLng } from "@/types/domain";
import { estimateLeg } from "./haversineProvider";
import type { RoutingProvider } from "./types";

const BASE_URL = "https://router.project-osrm.org";
const PROFILE = "driving";
const TIMEOUT_MS = 10_000;
/** El servidor público limita `table` a 100 coordenadas. */
export const OSRM_MAX_POINTS = 100;

const tableSchema = z.object({
  code: z.literal("Ok"),
  durations: z.array(z.array(z.number().nullable())),
});

const routeSchema = z.object({
  code: z.literal("Ok"),
  routes: z
    .array(
      z.object({
        geometry: z.string(),
        legs: z.array(z.object({ distance: z.number(), duration: z.number() })),
      }),
    )
    .min(1),
});

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

// OSRM usa el orden lng,lat.
const toCoords = (points: LatLng[]) =>
  points.map((point) => `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`).join(";");

async function getJson(url: string, fetchImpl: FetchLike): Promise<unknown> {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`OSRM respondió ${response.status}`);
  return response.json();
}

export function createOsrmProvider(fetchImpl: FetchLike = (input, init) => fetch(input, init)): RoutingProvider {
  return {
    async getMatrix(points) {
      if (points.length > OSRM_MAX_POINTS) throw new Error("Demasiados puntos para OSRM");
      const url = `${BASE_URL}/table/v1/${PROFILE}/${toCoords(points)}?annotations=duration`;
      const { durations } = tableSchema.parse(await getJson(url, fetchImpl));
      if (durations.length !== points.length) throw new Error("Matriz de OSRM incompleta");
      // `null` = par sin ruta por calles; se estima en vez de descartar toda la matriz.
      return durations.map((row, i) =>
        points.map((to, j) => {
          const from = points[i];
          return row[j] ?? (from ? estimateLeg(from, to).durationS : 0);
        }),
      );
    },
    async getRoute(orderedPoints) {
      const url = `${BASE_URL}/route/v1/${PROFILE}/${toCoords(orderedPoints)}?overview=full&geometries=polyline&steps=false`;
      const { routes } = routeSchema.parse(await getJson(url, fetchImpl));
      const route = routes[0];
      if (!route || route.legs.length !== orderedPoints.length - 1) {
        throw new Error("Ruta de OSRM incompleta");
      }
      return {
        geometry: route.geometry,
        legs: route.legs.map((leg) => ({ distanceM: leg.distance, durationS: leg.duration })),
      };
    },
  };
}
