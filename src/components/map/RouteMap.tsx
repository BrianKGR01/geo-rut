"use client";

import L from "leaflet";
import { useEffect } from "react";
import { Marker, Polyline, useMap } from "react-leaflet";
import type { MapMarker, MapView, UserPosition } from "@/types/map";
import { BaseMap, FlyToUser } from "./BaseMap";
import { numberedIcon } from "./leafletIcons";
import { UserDot } from "./UserDot";

interface RouteMapProps {
  markers: MapMarker[];
  path: [number, number][];
  approximate: boolean;
  user?: UserPosition;
  /** Dónde mirar cuando no hay tiendas ni GPS (país o ciudad aproximada). */
  fallbackView: MapView;
  /** Cambia cuando hay que volver a encuadrar todo (nueva tienda, nuevo orden, iniciar ruta). */
  fitKey: string;
  locateRequest: number;
  onMarkerClick?: (id: string) => void;
}

type FitProps = Pick<RouteMapProps, "markers" | "user" | "fitKey" | "fallbackView">;

function FitBounds({ markers, user, fitKey, fallbackView }: FitProps) {
  const map = useMap();
  const hasUser = user !== undefined;
  const fallbackKey = `${fallbackView.lat},${fallbackView.lng},${fallbackView.zoom}`;
  useEffect(() => {
    const points = markers.map((marker): [number, number] => [marker.lat, marker.lng]);
    if (user) points.push([user.lat, user.lng]);
    if (points.length === 0) map.setView([fallbackView.lat, fallbackView.lng], fallbackView.zoom);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    // La posición del usuario cambia todo el tiempo; solo se reencuadra cuando aparece por primera vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey, hasUser, fallbackKey]);
  return null;
}

export default function RouteMap(props: RouteMapProps) {
  const { markers, path, approximate, user, fallbackView, fitKey, locateRequest, onMarkerClick } = props;
  return (
    <BaseMap view={fallbackView}>
      <FitBounds markers={markers} user={user} fitKey={fitKey} fallbackView={fallbackView} />
      <FlyToUser user={user} request={locateRequest} />
      {path.length > 1 && (
        <Polyline
          positions={path}
          pathOptions={{
            className: "route-line",
            weight: 6,
            opacity: 0.9,
            dashArray: approximate ? "4 12" : undefined,
          }}
        />
      )}
      {user && <UserDot user={user} />}
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
