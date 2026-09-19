"use client";

import { useMapEvents } from "react-leaflet";
import type { LatLng } from "@/types/domain";
import { BaseMap } from "./BaseMap";

interface PickerMapProps {
  initialCenter: LatLng;
  zoom?: number;
  onCenterChange: (center: LatLng) => void;
}

function CenterTracker({ onCenterChange }: Pick<PickerMapProps, "onCenterChange">) {
  const map = useMapEvents({
    moveend: () => {
      const { lat, lng } = map.getCenter();
      onCenterChange({ lat, lng });
    },
  });
  return null;
}

/** Mapa para elegir ubicación moviendo el mapa bajo un pin fijo (el pin lo dibuja quien lo usa). */
export default function PickerMap({ initialCenter, zoom = 16, onCenterChange }: PickerMapProps) {
  return (
    <BaseMap center={initialCenter} zoom={zoom}>
      <CenterTracker onCenterChange={onCenterChange} />
    </BaseMap>
  );
}
