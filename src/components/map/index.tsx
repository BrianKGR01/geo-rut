"use client";

import dynamic from "next/dynamic";

function MapLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface text-ink-soft" role="status">
      Cargando mapa…
    </div>
  );
}

// Leaflet toca `window` al importarse: solo cliente y en un bundle aparte (carga diferida).
export const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false, loading: MapLoading });
export const ConfirmPinMap = dynamic(() => import("./ConfirmPinMap"), { ssr: false, loading: MapLoading });
export const PickerMap = dynamic(() => import("./PickerMap"), { ssr: false, loading: MapLoading });
