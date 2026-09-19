import type { LatLng } from "@/types/domain";

/**
 * Google Maps URLs (acción "dir"): https://developers.google.com/maps/documentation/urls/get-started
 * Sin `origin`, Google usa la ubicación actual del dispositivo; en el celular abre la app.
 */
export function googleMapsDirectionsUrl(destination: LatLng): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params}`;
}
