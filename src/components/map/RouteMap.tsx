"use client";

import L from "leaflet";
import { useEffect } from "react";
import { Circle, CircleMarker, Marker, Polyline, useMap } from "react-leaflet";
import type { MapMarker, UserPosition } from "@/types/map";
import { BaseMap } from "./BaseMap";
import { numberedIcon } from "./leafletIcons";

interface RouteMapProps {
  markers: MapMarker[];
  path: [number, number][];
  approximate: boolean;
  user?: UserPosition;
  /** Cambia cuando hay que volver a encuadrar todo (nueva tienda, nuevo orden, iniciar ruta). */
  fitKey: string;
  onMarkerClick?: (id: string) => void;
}

function FitBounds({ markers, user, fitKey }: Pick<RouteMapProps, "markers" | "user" | "fitKey">) {
  const map = useMap();
  const hasUser = user !== undefined;
  useEffect(() => {
    const points = markers.map((marker): [number, number] => [marker.lat, marker.lng]);
    if (user) points.push([user.lat, user.lng]);
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 16 });
    // La posición del usuario cambia todo el tiempo; solo se reencuadra cuando aparece por primera vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey, hasUser]);
  return null;
}

export default function RouteMap(props: RouteMapProps) {
  const { markers, path, approximate, user, fitKey, onMarkerClick } = props;
  return (
    <BaseMap>
      <FitBounds markers={markers} user={user} fitKey={fitKey} />
      {path.length > 1 && (
        <Polyline
          positions={path}
          pathOptions={{
            color: "#0b4fd6",
            weight: 5,
            opacity: 0.85,
            dashArray: approximate ? "4 10" : undefined,
          }}
        />
      )}
      {user && (
        <>
          <Circle
            center={[user.lat, user.lng]}
            radius={user.accuracy}
            pathOptions={{ color: "#0b4fd6", weight: 1, fillOpacity: 0.12 }}
            interactive={false}
          />
          <CircleMarker
            center={[user.lat, user.lng]}
            radius={8}
            pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#0b4fd6", fillOpacity: 1 }}
            interactive={false}
          />
        </>
      )}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={numberedIcon(marker.label, marker.variant)}
          title={marker.title}
          alt={marker.title}
          zIndexOffset={marker.variant === "next" || marker.variant === "delivering" ? 500 : 0}
          eventHandlers={onMarkerClick ? { click: () => onMarkerClick(marker.id) } : undefined}
        />
      ))}
    </BaseMap>
  );
}
