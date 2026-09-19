"use client";

import { useMemo, type ReactNode } from "react";
import { RouteMap } from "@/components/map";
import { useGeoStore } from "@/features/route/geoStore";
import { buildMarkers } from "@/features/route/markers";
import { useRouteView } from "@/features/route/useRouteView";
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
  const cache = view.route.legsCache;
  const markers = useMemo(() => buildMarkers(view, view.next?.id), [view]);
  const path = useMemo(() => (cache ? decodePolyline(cache.geometry) : []), [cache]);
  // Reencuadrar al cambiar las tiendas, su orden o el estado de la ruta; no con cada posición del GPS.
  const fitKey = `${view.route.status}|${view.route.stopOrder.join("|")}`;

  return (
    <section className={`relative ${className}`} aria-label="Mapa de la ruta">
      <RouteMap
        markers={markers}
        path={path}
        approximate={cache?.approximate ?? false}
        user={user}
        fitKey={fitKey}
        onMarkerClick={onMarkerClick}
      />
      {children}
    </section>
  );
}
