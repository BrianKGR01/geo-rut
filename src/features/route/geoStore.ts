import { create } from "zustand";
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
  /** Inicia el seguimiento. Llamar desde un gesto del usuario la primera vez (dispara el permiso). */
  start: () => void;
  /** Pausa el seguimiento (página oculta) sin olvidar la última posición. */
  pause: () => void;
}

const OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 };
const PERMISSION_DENIED = 1;

let watchId: number | undefined;

export const useGeoStore = create<GeoState>((set, get) => ({
  status: "idle",
  start: () => {
    if (watchId !== undefined) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      set({ status: "unavailable" });
      return;
    }
    if (!get().position) set({ status: "requesting" });
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
        }
      },
      OPTIONS,
    );
  },
  pause: () => {
    if (watchId === undefined) return;
    navigator.geolocation.clearWatch(watchId);
    watchId = undefined;
  },
}));

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
