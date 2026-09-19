import { useEffect } from "react";
import { useGeoStore } from "./geoStore";

/**
 * Mantiene el GPS encendido solo con la página visible (PRD RF-5/RF-6).
 * Al cargar, si el permiso YA estaba concedido se reanuda sin preguntar; si no, se espera al gesto.
 */
export function useGeolocationLifecycle() {
  useEffect(() => {
    const { start, pause } = useGeoStore.getState();
    let cancelled = false;

    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((permission) => {
        if (!cancelled && permission.state === "granted") start();
      })
      .catch(() => undefined);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        pause();
      } else if (useGeoStore.getState().status !== "idle" && useGeoStore.getState().status !== "denied") {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      pause();
    };
  }, []);
}
