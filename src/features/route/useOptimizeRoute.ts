import { useState } from "react";
import { useAppStore } from "@/lib/storage/store";
import { useGeoStore, waitForPosition } from "./geoStore";
import { optimizePendingOrder } from "./planRoute";
import { routingProviders } from "./providers";
import { groupStops } from "./selectors";

const POSITION_WAIT_MS = 8000;

/** Acción "Optimizar ruta": la única que reordena sola, y solo cuando el usuario la toca. */
export function useOptimizeRoute() {
  const [optimizing, setOptimizing] = useState(false);
  const [notice, setNotice] = useState<string>();

  const optimize = async () => {
    setOptimizing(true);
    setNotice(undefined);
    // Se llama dentro del gesto del usuario: aquí el navegador puede pedir el permiso.
    useGeoStore.getState().start();
    const position = await waitForPosition(POSITION_WAIT_MS);
    const { stops, route, applyOptimization } = useAppStore.getState();
    const pending = groupStops({ stops, route }).remaining.filter((stop) => stop.status === "pending");
    const result = await optimizePendingOrder(pending, position, routingProviders);
    applyOptimization(result.stopIds, position);
    // Con el permiso negado el aviso permanente de ubicación ya lo explica.
    if (!position && useGeoStore.getState().status !== "denied") {
      setNotice("No tengo tu ubicación: ordené partiendo de la primera tienda.");
    }
    setOptimizing(false);
  };

  return { optimize, optimizing, notice };
}
