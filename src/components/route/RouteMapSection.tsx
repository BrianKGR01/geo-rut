"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RouteMap } from "@/components/map";
import { LocateButton } from "@/components/map/LocateButton";
import { useGeoStore } from "@/features/route/geoStore";
import { buildMarkers } from "@/features/route/markers";
import { useRouteView } from "@/features/route/useRouteView";
import { FALLBACK_CENTER } from "@/lib/geo/approxCenter";
import { decodePolyline } from "@/lib/routing/polyline";

interface RouteMapSectionProps {
  className: string;
  onMarkerClick: (id: string) => void;
  /** Controles superpuestos al mapa (p. ej. botón de ampliar). */
  children?: ReactNode;
}

export function RouteMapSection({ className, onMarkerClick, children }: RouteMapSectionProps) {
  const view = useRouteView();
  const user = useGeoStore((state) => state.position);
  const approx = useGeoStore((state) => state.approxCenter);
  const [locateRequest, setLocateRequest] = useState(0);
  const cache = view.route.legsCache;
  const startPoint = view.route.status === "finished" ? undefined : view.route.startPoint;
  const markers = useMemo(() => buildMarkers(view, view.next?.id, startPoint), [view, startPoint]);
  const path = useMemo(() => (cache ? decodePolyline(cache.geometry) : []), [cache]);
  // Reencuadrar al cambiar las tiendas, su orden, la partida o el estado; no con cada posición del GPS.
  const startKey = startPoint ? `${startPoint.lat},${startPoint.lng}` : "-";
  const fitKey = `${view.route.status}|${startKey}|${view.route.stopOrder.join("|")}`;

  return (
    <section className={`relative ${className}`} aria-label="Mapa de la ruta">
      <RouteMap
        markers={markers}
        path={path}
        approximate={cache?.approximate ?? false}
        user={user}
        fallbackView={approx ?? FALLBACK_CENTER}
        fitKey={fitKey}
        locateRequest={locateRequest}
        onMarkerClick={onMarkerClick}
      />
      <LocateButton
        className="absolute bottom-7 right-3 z-10"
        onLocate={() => setLocateRequest((value) => value + 1)}
      />
      {children}
    </section>
  );
}
