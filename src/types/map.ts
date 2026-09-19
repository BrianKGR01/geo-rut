import type { LatLng } from "./domain";

export type MarkerVariant = "pending" | "next" | "delivering" | "delivered" | "start";

export interface MapMarker extends LatLng {
  id: string;
  label: string;
  variant: MarkerVariant;
  title: string;
}

export interface UserPosition extends LatLng {
  /** Radio de precisión en metros. */
  accuracy: number;
}

/** Vista inicial de un mapa cuando todavía no hay nada que encuadrar. */
export interface MapView extends LatLng {
  zoom: number;
}
