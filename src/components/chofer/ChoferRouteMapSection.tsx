"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RouteMap } from "@/components/map";
import { LocateButton } from "@/components/map/LocateButton";
import { useGeoStore } from "@/features/route/geoStore";
import { buildMarkers } from "@/features/route/markers";
import type { StopGroups } from "@/features/route/selectors";
import { FALLBACK_CENTER } from "@/lib/geo/approxCenter";
import { decodePolyline } from "@/lib/routing/polyline";
import type { LegsCache, RouteStatus, StartPoint } from "@/types/domain";

interface ChoferRouteMapSectionProps {
  className: string;
  onMarkerClick: (id: string) => void;
  groups: StopGroups;
  nextId: string | undefined;
  routeStatus: RouteStatus;
  stopOrder: string[];
  startPoint: StartPoint | undefined;
  legsCache: LegsCache | undefined;
  /** Controles superpuestos al mapa (p. ej. el contador "N/N entregadas"). */
  children?: ReactNode;
}

/**
 * Igual que `components/route/RouteMapSection.tsx` (v1), pero recibe la vista por props en vez de
 * leerla de `useRouteView()`/`useAppStore`: los datos vienen de `useChoferRoute` (Supabase). El
 * mapa en sí (`RouteMap`) es el mismo componente, sin cambios.
 */
export function ChoferRouteMapSection(props: ChoferRouteMapSectionProps) {
  const { className, onMarkerClick, groups, nextId, routeStatus, stopOrder, startPoint, legsCache, children } = props;
  const user = useGeoStore((state) => state.position);
  const approx = useGeoStore((state) => state.approxCenter);
  const [locateRequest, setLocateRequest] = useState(0);
  const markers = useMemo(() => buildMarkers(groups, nextId, startPoint), [groups, nextId, startPoint]);
  const path = useMemo(() => (legsCache ? decodePolyline(legsCache.geometry) : []), [legsCache]);
  const startKey = startPoint ? `${startPoint.lat},${startPoint.lng}` : "-";
  const fitKey = `${routeStatus}|${startKey}|${stopOrder.join("|")}`;

  return (
    <section className={`relative ${className}`} aria-label="Mapa de la ruta">
      <RouteMap
        markers={markers}
        path={path}
        approximate={legsCache?.approximate ?? false}
        user={user}
        fallbackView={approx ?? FALLBACK_CENTER}
        fitKey={fitKey}
        locateRequest={locateRequest}
        onMarkerClick={onMarkerClick}
      />
      <LocateButton className="absolute bottom-7 right-3 z-10" onLocate={() => setLocateRequest((value) => value + 1)} />
      {children}
    </section>
  );
}
