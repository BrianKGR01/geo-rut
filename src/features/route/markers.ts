import type { Stop } from "@/types/domain";
import type { MapMarker } from "@/types/map";
import type { StopGroups } from "./selectors";

/** Marcadores numerados según el orden de visita; las entregadas llevan ✓. */
export function buildMarkers(groups: StopGroups, nextId: string | undefined): MapMarker[] {
  const toMarker = (stop: Stop, label: string, variant: MapMarker["variant"]): MapMarker => ({
    id: stop.id,
    lat: stop.lat,
    lng: stop.lng,
    label,
    variant,
    title: stop.name,
  });
  return [
    ...groups.delivered.map((stop) => toMarker(stop, "✓", "delivered")),
    ...groups.remaining.map((stop, index) => {
      const variant =
        stop.status === "delivering" ? "delivering" : stop.id === nextId ? "next" : "pending";
      return toMarker(stop, String(index + 1), variant);
    }),
  ];
}
