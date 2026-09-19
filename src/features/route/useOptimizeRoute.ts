import { useState } from "react";
import { useAppStore } from "@/lib/storage/store";
import { useGeoStore, waitForPosition } from "./geoStore";
import { optimizePendingOrder } from "./planRoute";
import { routingProviders } from "./providers";
import { groupStops } from "./selectors";
import { plannedOrigin } from "./startPoint";

const POSITION_WAIT_MS = 8000;

/** Acción "Optimizar ruta": la única que reordena sola, y solo cuando el usuario la toca. */
export function useOptimizeRoute() {
  const [optimizing, setOptimizing] = useState(false);
  const [notice, setNotice] = useState<string>();

  const optimize = async () => {
    setOptimizing(true);
    setNotice(undefined);
    const before = useAppStore.getState();
    const needsGps = before.route.status === "active" || before.settings.startMode === "gps";
    // Se llama dentro del gesto del usuario: aquí el navegador puede pedir el permiso.
    if (needsGps) useGeoStore.getState().start();
    const gps = needsGps ? await waitForPosition(POSITION_WAIT_MS) : undefined;

    const state = useAppStore.getState();
    const origin = plannedOrigin(state, gps);
    const pending = groupStops(state).remaining.filter((stop) => stop.status === "pending");
    const result = await optimizePendingOrder(pending, origin, routingProviders);
    state.applyOptimization(result.stopIds, origin);
    if (!origin) setNotice("No tengo tu ubicación: ordené partiendo de la primera tienda.");
    setOptimizing(false);
  };

  return { optimize, optimizing, notice };
}
