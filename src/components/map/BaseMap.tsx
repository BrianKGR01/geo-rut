"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, type ReactNode } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { LatLng } from "@/types/domain";
import { DEFAULT_CENTER } from "./defaultCenter";

/** Leaflet no se entera solo cuando su contenedor cambia de tamaño (mapa expandible). */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

interface BaseMapProps {
  center?: LatLng;
  zoom?: number;
  children?: ReactNode;
}

export function BaseMap({ center = DEFAULT_CENTER, zoom = 13, children }: BaseMapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <ResizeWatcher />
      {children}
    </MapContainer>
  );
}
