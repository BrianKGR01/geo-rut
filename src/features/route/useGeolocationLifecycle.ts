import { useEffect } from "react";
import { z } from "zod";
import { centerFromTimeZone } from "@/lib/geo/approxCenter";
import { useGeoStore } from "./geoStore";

const approxSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  zoom: z.number().min(1).max(18),
});

/** Centro provisional del mapa: primero el país (zona horaria, sin red) y luego la ciudad (IP, vía Vercel). */
async function loadApproxCenter(signal: AbortSignal) {
  const { setApproxCenter } = useGeoStore.getState();
  setApproxCenter(centerFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone));
  try {
    const response = await fetch("/api/approx-location", { signal });
    const parsed = approxSchema.safeParse(await response.json());
    if (parsed.success) setApproxCenter(parsed.data);
  } catch {
    // Sin red o fuera de Vercel: queda la vista por país.
  }
}

/**
 * Mantiene el GPS encendido solo con la página visible (PRD RF-5/RF-6).
 * Al cargar, si el permiso YA estaba concedido se reanuda sin preguntar; si no, se espera al gesto.
 */
export function useGeolocationLifecycle() {
  useEffect(() => {
    const { start, pause } = useGeoStore.getState();
    const controller = new AbortController();
    void loadApproxCenter(controller.signal);

    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((permission) => {
        if (!controller.signal.aborted && permission.state === "granted") start();
      })
      .catch(() => undefined);

    const onVisibility = () => {
      const { status } = useGeoStore.getState();
      if (document.visibilityState === "hidden") pause();
      else if (status !== "idle" && status !== "denied" && status !== "unavailable") start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onVisibility);
      pause();
    };
  }, []);
}
