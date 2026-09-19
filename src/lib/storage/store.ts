import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  addStop as addStopOp,
  createStop,
  removeStop as removeStopOp,
  updateStop as updateStopOp,
  type NewStopInput,
  type StopPatch,
} from "@/features/stops/stopsOps";
import type { AppData } from "@/types/domain";
import { newId } from "./id";
import { migratePersisted } from "./migrations";
import { emptyAppData, SCHEMA_VERSION } from "./schema";

export const STORAGE_KEY = "rutatiendas-v1";
export const BACKUP_KEY = "rutatiendas-backup";

export interface AppActions {
  addStop: (input: NewStopInput) => string;
  updateStop: (id: string, patch: StopPatch) => void;
  removeStop: (id: string) => void;
  startNewRoute: () => void;
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
      (set) => ({
        ...emptyAppData(),
        addStop: (input) => {
          const stop = createStop(input, newId(), new Date().toISOString());
          set((state) => addStopOp(state, stop));
          return stop.id;
        },
        updateStop: (id, patch) => set((state) => updateStopOp(state, id, patch)),
        removeStop: (id) => set((state) => removeStopOp(state, id)),
        startNewRoute: () => set(emptyAppData()),
      }),
      {
        name: STORAGE_KEY,
        version: SCHEMA_VERSION,
        storage: createJSONStorage(() => storage),
        partialize: (state): AppData => ({ stops: state.stops, route: state.route }),
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
