import { describe, expect, it } from "vitest";
import { enqueueStopWrite, loadPendingStopWrites, removeStopWrite, type QueueStorage } from "./pendingStopWrites";

function fakeStorage(): QueueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("pendingStopWrites", () => {
  it("no tiene nada pendiente al empezar", () => {
    expect(loadPendingStopWrites(fakeStorage())).toEqual([]);
  });

  it("encola una escritura y la mantiene entre lecturas (persistida)", () => {
    const storage = fakeStorage();
    enqueueStopWrite({ routeStopId: "stop-1", status: "delivering", arrivedAt: "2026-09-21T10:00:00.000Z" }, storage);
    const pending = loadPendingStopWrites(storage);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ routeStopId: "stop-1", status: "delivering" });
    expect(pending[0].id).toBeTruthy();
  });

  it("mantiene el orden de varias escrituras encoladas (converge igual que se aplicaron)", () => {
    const storage = fakeStorage();
    enqueueStopWrite({ routeStopId: "stop-1", status: "delivering", arrivedAt: "t1" }, storage);
    enqueueStopWrite({ routeStopId: "stop-1", status: "delivered", deliveredAt: "t2", note: "" }, storage);
    const pending = loadPendingStopWrites(storage);
    expect(pending.map((write) => write.status)).toEqual(["delivering", "delivered"]);
  });

  it("quita solo la escritura indicada al reintentarla con éxito", () => {
    const storage = fakeStorage();
    enqueueStopWrite({ routeStopId: "stop-1", status: "delivering", arrivedAt: "t1" }, storage);
    const second = enqueueStopWrite({ routeStopId: "stop-2", status: "delivering", arrivedAt: "t2" }, storage);
    removeStopWrite(second.id, storage);
    const pending = loadPendingStopWrites(storage);
    expect(pending).toHaveLength(1);
    expect(pending[0].routeStopId).toBe("stop-1");
  });

  it("ignora datos corruptos en el storage en vez de romper la app", () => {
    const storage = fakeStorage();
    storage.setItem("rutatiendas-chofer-write-queue", "{no es json valido");
    expect(loadPendingStopWrites(storage)).toEqual([]);
  });

  it("ignora filas que no cumplen el esquema esperado", () => {
    const storage = fakeStorage();
    storage.setItem("rutatiendas-chofer-write-queue", JSON.stringify([{ id: "x", status: "no-existe" }]));
    expect(loadPendingStopWrites(storage)).toEqual([]);
  });
});
