import type { LatLng, Stop } from "@/types/domain";
import type { MapMarker } from "@/types/map";
import type { StopGroups } from "./selectors";

export const START_MARKER_ID = "__start__";

/** Marcadores numerados según el orden de visita; las entregadas llevan ✓ y la partida "INI". */
export function buildMarkers(
  groups: StopGroups,
  nextId: string | undefined,
  startPoint: LatLng | undefined,
): MapMarker[] {
  const toMarker = (stop: Stop, label: string, variant: MapMarker["variant"]): MapMarker => ({
    id: stop.id,
    lat: stop.lat,
    lng: stop.lng,
    label,
    variant,
    title: stop.name,
  });
  const start: MapMarker[] = startPoint
    ? [{ id: START_MARKER_ID, lat: startPoint.lat, lng: startPoint.lng, label: "INI", variant: "start", title: "Punto de partida" }]
    : [];
  return [
    ...start,
    ...groups.delivered.map((stop) => toMarker(stop, "✓", "delivered")),
    ...groups.remaining.map((stop, index) => {
      const variant =
        stop.status === "delivering" ? "delivering" : stop.id === nextId ? "next" : "pending";
      return toMarker(stop, String(index + 1), variant);
    }),
  ];
}
