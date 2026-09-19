import { create } from "zustand";
import type { LatLng } from "@/types/domain";
import type { UserPosition } from "@/types/map";

/**
 * idle: nunca se pidió · requesting: esperando la primera posición · active: hay posición ·
 * denied: permiso negado · unavailable: el navegador no ofrece GPS (o la página no es HTTPS) ·
 * error: el GPS no responde (se sigue intentando).
 */
export type GeoStatus = "idle" | "requesting" | "active" | "denied" | "unavailable" | "error";

interface GeoState {
  status: GeoStatus;
  position?: UserPosition;
  /** Ubicación gruesa (ciudad/país) solo para centrar el mapa mientras no hay GPS. Nunca se usa para rutas. */
  approxCenter?: LatLng & { zoom: number };
  /** Inicia el seguimiento. Llamar desde un gesto del usuario la primera vez (dispara el permiso). */
  start: () => void;
  /** Pausa el seguimiento (página oculta) sin olvidar la última posición. */
  pause: () => void;
  setApproxCenter: (center: LatLng & { zoom: number }) => void;
}

const PERMISSION_DENIED = 1;
const PRECISE: PositionOptions = { enableHighAccuracy: true, maximumAge: 5000, timeout: 15_000 };
// Bajo techo el GPS puro puede no responder nunca: wifi/antenas dan algo utilizable enseguida.
const COARSE: PositionOptions = { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 };

let watchId: number | undefined;

export const useGeoStore = create<GeoState>((set, get) => {
  const watch = (options: PositionOptions) => {
    watchId = navigator.geolocation.watchPosition(
      ({ coords }) =>
        set({
          status: "active",
          position: { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy },
        }),
      (error) => {
        if (error.code === PERMISSION_DENIED) {
          get().pause();
          set({ status: "denied", position: undefined });
        } else if (!get().position) {
          set({ status: "error" });
          if (options === PRECISE) {
            get().pause();
            watch(COARSE);
          }
        }
      },
      options,
    );
  };

  return {
    status: "idle",
    start: () => {
      if (watchId !== undefined) return;
      // En http (que no sea localhost) el navegador niega el GPS sin preguntar: se avisa como "no disponible".
      const insecure = typeof window !== "undefined" && window.isSecureContext === false;
      if (insecure || typeof navigator === "undefined" || !("geolocation" in navigator)) {
        set({ status: "unavailable" });
        return;
      }
      if (!get().position) set({ status: "requesting" });
      watch(PRECISE);
    },
    pause: () => {
      if (watchId === undefined) return;
      navigator.geolocation.clearWatch(watchId);
      watchId = undefined;
    },
    setApproxCenter: (approxCenter) => set({ approxCenter }),
  };
});

/** Espera una posición (p. ej. justo después de pedir el permiso). `undefined` si no llega a tiempo. */
export function waitForPosition(timeoutMs: number): Promise<UserPosition | undefined> {
  const current = useGeoStore.getState();
  if (current.position) return Promise.resolve(current.position);
  return new Promise((resolve) => {
    const finish = (position: UserPosition | undefined) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(position);
    };
    const timer = setTimeout(() => finish(undefined), timeoutMs);
    const unsubscribe = useGeoStore.subscribe((state) => {
      if (state.position) finish(state.position);
      else if (state.status === "denied" || state.status === "unavailable") finish(undefined);
    });
  });
}
