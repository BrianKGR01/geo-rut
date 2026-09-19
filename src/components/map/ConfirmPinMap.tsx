"use client";

import type L from "leaflet";
import { useMemo } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import type { LatLng } from "@/types/domain";
import { BaseMap } from "./BaseMap";
import { pinIcon } from "./leafletIcons";

interface ConfirmPinMapProps {
  position: LatLng;
  onChange: (position: LatLng) => void;
}

function TapToMove({ onChange }: Pick<ConfirmPinMapProps, "onChange">) {
  useMapEvents({
    click: (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });
  return null;
}

/** Mini-mapa con pin arrastrable para confirmar la ubicación de una tienda. */
export default function ConfirmPinMap({ position, onChange }: ConfirmPinMapProps) {
  const handlers = useMemo(
    () => ({
      dragend: (event: L.DragEndEvent) => {
        const marker: L.Marker = event.target;
        const { lat, lng } = marker.getLatLng();
        onChange({ lat, lng });
      },
    }),
    [onChange],
  );

  return (
    <BaseMap center={position} zoom={17}>
      <TapToMove onChange={onChange} />
      <Marker
        position={[position.lat, position.lng]}
        icon={pinIcon}
        draggable
        eventHandlers={handlers}
        alt="Ubicación de la tienda"
      />
    </BaseMap>
  );
}
