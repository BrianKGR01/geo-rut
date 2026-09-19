"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useGeoStore, waitForPosition } from "@/features/route/geoStore";
import { useAppStore } from "@/lib/storage/store";

const POSITION_WAIT_MS = 5000;

export function StartRouteButton() {
  const startRoute = useAppStore((state) => state.startRoute);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    // Dentro del gesto: si hace falta, aquí se pide el permiso de ubicación.
    useGeoStore.getState().start();
    startRoute(await waitForPosition(POSITION_WAIT_MS));
    setStarting(false);
  };

  return (
    <Button big onClick={start} disabled={starting}>
      {starting ? "Iniciando…" : "Iniciar ruta"}
    </Button>
  );
}
