import { useEffect, useRef, useState } from "react";
import { evaluateArrival } from "@/features/delivery/arrival";
import type { Stop } from "@/types/domain";
import { useGeoStore } from "./geoStore";

/**
 * Misma lógica que `features/delivery/useArrivalDetection.ts` (v1), pero recibe la tienda destino
 * y la acción "marcar llegada" por parámetro en vez de leerlas de `useAppStore`: así sirve para el
 * chofer (Supabase) sin duplicar las reglas de `evaluateArrival`.
 */
export function useChoferArrivalDetection(
  target: Stop | undefined,
  onArrive: (stopId: string) => void,
): { askStopId?: string; dismissAsk: () => void } {
  const [askStopId, setAskStopId] = useState<string>();
  const dismissedFor = useRef<string | undefined>(undefined);
  const targetRef = useRef(target);
  const onArriveRef = useRef(onArrive);

  // "Última versión" de los parámetros para que el efecto de abajo no tenga que resuscribirse en
  // cada render (los refs solo se leen desde el callback de la suscripción, nunca en el render).
  useEffect(() => {
    targetRef.current = target;
    onArriveRef.current = onArrive;
  });

  useEffect(() => {
    const check = () => {
      const current = targetRef.current;
      if (!current || current.status !== "pending") {
        setAskStopId(undefined);
        return;
      }
      const verdict = evaluateArrival(useGeoStore.getState().position, current);
      if (verdict === "arrived") onArriveRef.current(current.id);
      setAskStopId(verdict === "ask" && dismissedFor.current !== current.id ? current.id : undefined);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") dismissedFor.current = undefined;
    };

    const unsubscribeGeo = useGeoStore.subscribe(check);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unsubscribeGeo();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [target?.id, target?.status]);

  const dismissAsk = () => {
    dismissedFor.current = askStopId;
    setAskStopId(undefined);
  };

  return { askStopId, dismissAsk };
}
