import { useEffect, useRef, useState } from "react";
import { useGeoStore } from "@/features/route/geoStore";
import { useAppStore } from "@/lib/storage/store";
import { evaluateArrival } from "./arrival";

/**
 * Conecta el GPS con la ruta: cada posición nueva (solo llegan con la página visible, y una fresca
 * al volver de Google Maps) se compara con la tienda destino. GPS confiable dentro del radio →
 * "Entregando"; GPS impreciso → devuelve el id de la tienda por la que hay que preguntar.
 */
export function useArrivalDetection(): { askStopId?: string; dismissAsk: () => void } {
  const [askStopId, setAskStopId] = useState<string>();
  const dismissedFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    const check = () => {
      const { stops, route, markArrived } = useAppStore.getState();
      const target = stops.find((stop) => stop.id === route.currentTargetId);
      if (route.status !== "active" || !target || target.status !== "pending") {
        setAskStopId(undefined);
        return;
      }
      const verdict = evaluateArrival(useGeoStore.getState().position, target);
      if (verdict === "arrived") markArrived(target.id);
      setAskStopId(verdict === "ask" && dismissedFor.current !== target.id ? target.id : undefined);
    };

    // Al volver a la app se vuelve a preguntar aunque antes se haya dicho "todavía no".
    const onVisibility = () => {
      if (document.visibilityState === "visible") dismissedFor.current = undefined;
    };

    const unsubscribeGeo = useGeoStore.subscribe(check);
    const unsubscribeApp = useAppStore.subscribe((state, previous) => {
      if (state.route.currentTargetId !== previous.route.currentTargetId) check();
    });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unsubscribeGeo();
      unsubscribeApp();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const dismissAsk = () => {
    dismissedFor.current = askStopId;
    setAskStopId(undefined);
  };

  return { askStopId, dismissAsk };
}
