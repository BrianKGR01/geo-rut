import { z } from "zod";
import type { LatLng } from "@/types/domain";
import { isValidLatLng } from "./haversine";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// La política de uso exige un User-Agent que identifique a la aplicación.
const USER_AGENT = "RutaTiendas/0.1 (app web de rutas de entrega; uso personal)";
const MIN_INTERVAL_MS = 1100;
const TIMEOUT_MS = 8000;

const responseSchema = z.array(z.object({ lat: z.string(), lon: z.string() }));

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

/** Serializa las llamadas para respetar 1 req/s (por instancia del servidor). */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function geocodeWithNominatim(
  query: string,
  fetchImpl: FetchLike = fetch,
): Promise<LatLng | null> {
  const url = `${NOMINATIM_URL}?${new URLSearchParams({ q: query, format: "jsonv2", limit: "1" })}`;
  return throttled(async () => {
    const response = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const parsed = responseSchema.safeParse(await response.json());
    const first = parsed.success ? parsed.data[0] : undefined;
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    return isValidLatLng(lat, lng) ? { lat, lng } : null;
  });
}
