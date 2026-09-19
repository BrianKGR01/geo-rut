import { useMemo } from "react";
import { useAppStore } from "@/lib/storage/store";
import { groupStops, nextStop } from "./selectors";

/** Vista derivada de la ruta; memoizada porque los selectores de Zustand deben devolver referencias estables. */
export function useRouteView() {
  const stops = useAppStore((state) => state.stops);
  const route = useAppStore((state) => state.route);
  return useMemo(() => {
    const data = { stops, route };
    return { route, stops, ...groupStops(data), next: nextStop(data) };
  }, [stops, route]);
}
