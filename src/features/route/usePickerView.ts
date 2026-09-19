import { FALLBACK_CENTER } from "@/lib/geo/approxCenter";
import { useAppStore } from "@/lib/storage/store";
import type { MapView } from "@/types/map";
import { useGeoStore } from "./geoStore";

/**
 * Dónde abrir un mapa para elegir un punto nuevo: mi ubicación; si no, la última tienda;
 * si no, la ciudad/país aproximados. `guessed` indica que conviene corregirlo cuando llegue el GPS.
 */
export function usePickerView(): { view: MapView; guessed: boolean } {
  const position = useGeoStore((state) => state.position);
  const approx = useGeoStore((state) => state.approxCenter);
  const lastStop = useAppStore((state) => state.stops.at(-1));
  if (position) return { view: { lat: position.lat, lng: position.lng, zoom: 17 }, guessed: false };
  if (lastStop) return { view: { lat: lastStop.lat, lng: lastStop.lng, zoom: 15 }, guessed: true };
  return { view: approx ?? FALLBACK_CENTER, guessed: true };
}
