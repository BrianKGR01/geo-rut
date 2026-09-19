import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { reduceDelivery, settleRoute, type DeliveryEvent } from "@/features/delivery/reducer";
import { applyOptimizedOrder, reorderManually } from "@/features/route/orderOps";
import { chooseFixedStart, chooseGpsStart, freshRoute } from "@/features/route/startPoint";
import {
  addStop as addStopOp,
  createStop,
  removeStop as removeStopOp,
  updateStop as updateStopOp,
  type NewStopInput,
  type StopPatch,
} from "@/features/stops/stopsOps";
import type { AppData, FixedStart, LatLng, LegsCache, ThemeMode } from "@/types/domain";
import { newId } from "./id";
import { migratePersisted } from "./migrations";
import { emptyAppData, SCHEMA_VERSION } from "./schema";

export const STORAGE_KEY = "rutatiendas-v1";
export const BACKUP_KEY = "rutatiendas-backup";

export interface AppActions {
  addStop: (input: NewStopInput) => string;
  updateStop: (id: string, patch: StopPatch) => void;
  removeStop: (id: string) => void;
  /** Reorden manual de las tiendas no entregadas. */
  reorderStops: (remainingIds: string[]) => void;
  applyOptimization: (pendingIds: string[], origin: LatLng | undefined) => void;
  /** Fija el punto de partida si todavía no hay uno (primera vez que se conoce la ubicación). */
  captureStartPoint: (origin: LatLng) => void;
  saveLegsCache: (cache: LegsCache | undefined) => void;
  startRoute: (origin: LatLng | undefined) => boolean;
  goToStop: (stopId: string) => boolean;
  markArrived: (stopId: string) => boolean;
  setDeliveryNote: (stopId: string, note: string) => boolean;
  markDelivered: (stopId: string) => boolean;
  undoStop: (stopId: string) => boolean;
  /** Borra tiendas y entregas; conserva los ajustes (tema, partida fija). */
  startNewRoute: () => void;
  setTheme: (theme: ThemeMode) => void;
  setFixedStart: (point: FixedStart) => void;
  /** La ruta parte de donde esté el celular; `position` es la ubicación conocida ahora (si la hay). */
  setGpsStart: (position: LatLng | undefined) => void;
}

export type AppState = AppData & AppActions;

const memoryStorage = (): StateStorage => {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
};

function browserStorage(): StateStorage {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // localStorage bloqueado (modo privado estricto): se sigue en memoria.
  }
  return memoryStorage();
}

const toStartPoint = (origin: LatLng) => ({
  lat: origin.lat,
  lng: origin.lng,
  capturedAt: new Date().toISOString(),
});

export function createAppStore(storage: StateStorage = browserStorage()) {
  const recover = (persisted: unknown, version: number): AppData => {
    const result = migratePersisted(persisted, version);
    if (!result.ok && persisted != null) {
      // No se pisa lo irrecuperable sin dejar una copia para rescatarlo a mano.
      storage.setItem(BACKUP_KEY, JSON.stringify(persisted));
    }
    return result.data;
  };

  return create<AppState>()(
    persist(
      (set, get) => {
        /** Toda transición de estado pasa por el reductor; si la rechaza, no cambia nada. */
        const dispatch = (event: DeliveryEvent): boolean => {
          const result = reduceDelivery(get(), event);
          if (result.ok) set(result.data);
          return result.ok;
        };
        const now = () => new Date().toISOString();
        return {
          ...emptyAppData(),
          addStop: (input) => {
            const stop = createStop(input, newId(), new Date().toISOString());
            set((state) => settleRoute(addStopOp(state, stop), now()));
            return stop.id;
          },
          updateStop: (id, patch) => set((state) => updateStopOp(state, id, patch)),
          removeStop: (id) => set((state) => settleRoute(removeStopOp(state, id), now())),
          reorderStops: (remainingIds) => set((state) => reorderManually(state, remainingIds)),
          applyOptimization: (pendingIds, origin) =>
            set((state) =>
              applyOptimizedOrder(state, pendingIds, origin && toStartPoint(origin)),
            ),
          captureStartPoint: (origin) =>
            set((state) =>
              state.route.startPoint ? state : { route: { ...state.route, startPoint: toStartPoint(origin) } },
            ),
          saveLegsCache: (legsCache) => set((state) => ({ route: { ...state.route, legsCache } })),
          startRoute: (origin) => dispatch({ type: "START_ROUTE", at: now(), startPoint: origin }),
          goToStop: (stopId) => dispatch({ type: "GO_TO", stopId }),
          markArrived: (stopId) => dispatch({ type: "ARRIVE", stopId, at: now() }),
          setDeliveryNote: (stopId, note) => dispatch({ type: "SET_NOTE", stopId, note }),
          markDelivered: (stopId) => dispatch({ type: "DELIVER", stopId, at: now() }),
          undoStop: (stopId) => dispatch({ type: "UNDO", stopId, at: now() }),
          startNewRoute: () =>
            set((state) => ({ stops: [], route: freshRoute(state.settings, now()) })),
          setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),
          setFixedStart: (point) => set((state) => chooseFixedStart(state, point, now())),
          setGpsStart: (position) => set((state) => chooseGpsStart(state, position, now())),
        };
      },
      {
        name: STORAGE_KEY,
        version: SCHEMA_VERSION,
        storage: createJSONStorage(() => storage),
        partialize: (state): AppData => ({
          stops: state.stops,
          route: state.route,
          settings: state.settings,
        }),
        migrate: (persisted, version) => recover(persisted, version),
        merge: (persisted, current) => ({
          ...current,
          ...recover(persisted ?? emptyAppData(), SCHEMA_VERSION),
        }),
      },
    ),
  );
}

export const useAppStore = createAppStore();
