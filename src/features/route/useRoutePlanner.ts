import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/storage/store";
import { computeLegsCache, currentRouteRequest } from "./planRoute";
import { routingProviders } from "./providers";

const DEBOUNCE_MS = 600;

/**
 * Mantiene `legsCache` al día con las tiendas y su orden. No recalcula si la clave no cambió;
 * una ruta aproximada se reintenta al volver la conexión o al volver a la app.
 */
export function useRoutePlanner(): { calculating: boolean } {
  const stops = useAppStore((state) => state.stops);
  const route = useAppStore((state) => state.route);
  const saveLegsCache = useAppStore((state) => state.saveLegsCache);
  const request = useMemo(() => currentRouteRequest({ stops, route }), [stops, route]);
  const [calculating, setCalculating] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const handledRetry = useRef(0);
  const cacheKey = route.legsCache?.key;
  const approximate = route.legsCache?.approximate ?? false;

  useEffect(() => {
    const retry = () => setRetryToken((token) => token + 1);
    const onVisible = () => document.visibilityState === "visible" && retry();
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!request) {
      if (cacheKey !== undefined) saveLegsCache(undefined);
      return;
    }
    const isRetry = approximate && handledRetry.current !== retryToken;
    if (request.key === cacheKey && !isRetry) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      handledRetry.current = retryToken;
      setCalculating(true);
      const cache = await computeLegsCache(request, routingProviders);
      if (cancelled) return;
      saveLegsCache(cache);
      setCalculating(false);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setCalculating(false);
    };
  }, [request, cacheKey, approximate, retryToken, saveLegsCache]);

  return { calculating };
}
