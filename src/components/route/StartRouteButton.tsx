"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useGeoStore, waitForPosition } from "@/features/route/geoStore";
import { plannedOrigin } from "@/features/route/startPoint";
import { useAppStore } from "@/lib/storage/store";

const POSITION_WAIT_MS = 5000;

export function StartRouteButton() {
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    // Dentro del gesto: si hace falta, aquí se pide el permiso. El GPS se enciende aunque la
    // partida sea fija, porque durante la ruta detecta la llegada a cada tienda.
    useGeoStore.getState().start();
    const needsFix = useAppStore.getState().settings.startMode === "gps";
    const gps = needsFix ? await waitForPosition(POSITION_WAIT_MS) : useGeoStore.getState().position;
    const state = useAppStore.getState();
    state.startRoute(plannedOrigin(state, gps));
    setStarting(false);
  };

  return (
    <Button big icon="play" onClick={start} disabled={starting}>
      {starting ? "Iniciando…" : "Iniciar ruta"}
    </Button>
  );
}
