import type { LatLng } from "./domain";

export type MarkerVariant = "pending" | "next" | "delivering" | "delivered";

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
