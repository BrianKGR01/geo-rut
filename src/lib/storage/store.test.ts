import { describe, expect, it } from "vitest";
import type { StateStorage } from "zustand/middleware";
import { BACKUP_KEY, createAppStore, STORAGE_KEY } from "./store";

function fakeStorage(initial: Record<string, string> = {}): StateStorage & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const input = {
  name: "Bodega Ana",
  lat: -12.05,
  lng: -77.04,
  coordsSource: "link-exact" as const,
};

describe("store persistente", () => {
  it("agrega una tienda al final del orden y la persiste", () => {
    const storage = fakeStorage();
    const store = createAppStore(storage);
    const id = store.getState().addStop(input);
    expect(store.getState().route.stopOrder).toEqual([id]);
    const saved = JSON.parse(storage.data.get(STORAGE_KEY) ?? "{}");
    expect(saved.version).toBe(2);
    expect(saved.state.stops[0].name).toBe("Bodega Ana");
  });

  it("recupera el estado guardado al crearse de nuevo", () => {
    const storage = fakeStorage();
    const first = createAppStore(storage);
    const id = first.getState().addStop(input);
    const second = createAppStore(storage);
    expect(second.getState().stops.map((stop) => stop.id)).toEqual([id]);
  });

  it("eliminar una tienda la quita también del orden", () => {
    const store = createAppStore(fakeStorage());
    const a = store.getState().addStop(input);
    const b = store.getState().addStop({ ...input, name: "Tienda B" });
    store.getState().removeStop(a);
    expect(store.getState().route.stopOrder).toEqual([b]);
  });

  it("nueva ruta limpia todo", () => {
    const store = createAppStore(fakeStorage());
    store.getState().addStop(input);
    store.getState().startNewRoute();
    expect(store.getState().stops).toEqual([]);
    expect(store.getState().route.status).toBe("draft");
  });

  it("nueva ruta conserva los ajustes y nace con la partida fija", () => {
    const store = createAppStore(fakeStorage());
    store.getState().setTheme("dark");
    store.getState().setFixedStart({ lat: -17.78, lng: -63.18, label: "Depósito" });
    store.getState().addStop(input);
    store.getState().startNewRoute();
    expect(store.getState().stops).toEqual([]);
    expect(store.getState().settings).toMatchObject({ theme: "dark", startMode: "fixed" });
    expect(store.getState().route.startPoint).toMatchObject({ lat: -17.78, lng: -63.18 });
  });

  it("lee datos guardados por la versión anterior (v1) sin perderlos", () => {
    const v1 = {
      state: {
        stops: [{ id: "a", name: "Bodega", lat: -12, lng: -77, coordsSource: "manual", status: "pending", orderItems: [], createdAt: "2026-01-01T00:00:00.000Z" }],
        route: { status: "draft", stopOrder: ["a"], orderMode: "manual" },
      },
      version: 1,
    };
    const store = createAppStore(fakeStorage({ [STORAGE_KEY]: JSON.stringify(v1) }));
    expect(store.getState().stops).toHaveLength(1);
    expect(store.getState().settings.startMode).toBe("gps");
  });

  it("con datos corruptos arranca vacío y deja una copia de respaldo", () => {
    const storage = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({ state: { stops: "x" }, version: 2 }),
    });
    const store = createAppStore(storage);
    expect(store.getState().stops).toEqual([]);
    expect(storage.data.get(BACKUP_KEY)).toContain('"stops":"x"');
  });
});
