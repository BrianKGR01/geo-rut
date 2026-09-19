"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, type ReactNode } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { MapView, UserPosition } from "@/types/map";

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

interface FlyToUserProps {
  user?: UserPosition;
  /** Cada incremento es un toque en "mi ubicación"; si la posición aún no llegó, se centra al llegar. */
  request: number;
}

/** Centra el mapa en el usuario cuando lo pide (botón "mi ubicación"). */
export function FlyToUser({ user, request }: FlyToUserProps) {
  const map = useMap();
  const hasUser = user !== undefined;
  useEffect(() => {
    if (request === 0 || !user) return;
    map.setView([user.lat, user.lng], Math.max(map.getZoom(), 16));
    // Solo al pedirlo o al llegar la primera posición; no con cada lectura del GPS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, request, hasUser]);
  return null;
}

interface BaseMapProps {
  view: MapView;
  children?: ReactNode;
}

export function BaseMap({ view, children }: BaseMapProps) {
  return (
    <MapContainer center={[view.lat, view.lng]} zoom={view.zoom} className="h-full w-full" zoomControl={false}>
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
