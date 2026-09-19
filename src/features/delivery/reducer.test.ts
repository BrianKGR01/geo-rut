import { describe, expect, it } from "vitest";
import { defaultSettings } from "@/lib/storage/schema";
import type { AppData, Stop } from "@/types/domain";
import { reduceDelivery, settleRoute, type DeliveryEvent, type ReduceResult } from "./reducer";

const T0 = "2026-01-01T10:00:00.000Z";
const T1 = "2026-01-01T10:30:00.000Z";
const T2 = "2026-01-01T10:45:00.000Z";

const stop = (id: string, extra: Partial<Stop> = {}): Stop => ({
  id,
  name: id,
  lat: -12,
  lng: -77,
  coordsSource: "manual",
  status: "pending",
  orderItems: [],
  createdAt: T0,
  ...extra,
});

const data = (stops: Stop[], route: Partial<AppData["route"]> = {}): AppData => ({
  stops,
  route: { status: "active", stopOrder: stops.map((s) => s.id), orderMode: "manual", ...route },
  settings: defaultSettings(),
});

function apply(initial: AppData, ...events: DeliveryEvent[]): AppData {
  return events.reduce((current, event) => {
    const result = reduceDelivery(current, event);
    if (!result.ok) throw new Error(`rechazado ${event.type}: ${result.reason}`);
    return result.data;
  }, initial);
}

const reason = (result: ReduceResult) => (result.ok ? "ok" : result.reason);
const byId = (d: AppData, id: string) => d.stops.find((s) => s.id === id);

describe("iniciar ruta", () => {
  it("pasa de draft a active y guarda hora y punto de partida", () => {
    const next = apply(data([stop("a")], { status: "draft" }), {
      type: "START_ROUTE", at: T0, startPoint: { lat: -12.1, lng: -77.1 },
    });
    expect(next.route).toMatchObject({
      status: "active", startedAt: T0, startPoint: { lat: -12.1, lng: -77.1, capturedAt: T0 },
    });
  });

  it("sin ubicación conserva el punto de partida anterior (o ninguno)", () => {
    const next = apply(data([stop("a")], { status: "draft" }), { type: "START_ROUTE", at: T0 });
    expect(next.route.startPoint).toBeUndefined();
  });

  it("rechaza iniciar sin tiendas o con la ruta ya iniciada", () => {
    expect(reason(reduceDelivery(data([], { status: "draft" }), { type: "START_ROUTE", at: T0 }))).toBe("NOTHING_TO_DELIVER");
    expect(reason(reduceDelivery(data([stop("a")]), { type: "START_ROUTE", at: T0 }))).toBe("ROUTE_ALREADY_STARTED");
  });
});

describe("ciclo de una entrega", () => {
  it("pending → delivering → delivered con sus marcas de tiempo", () => {
    let d = apply(data([stop("a"), stop("b")]), { type: "GO_TO", stopId: "a" });
    expect(d.route.currentTargetId).toBe("a");

    d = apply(d, { type: "ARRIVE", stopId: "a", at: T1 });
    expect(byId(d, "a")).toMatchObject({ status: "delivering", arrivedAt: T1 });

    d = apply(d, { type: "SET_NOTE", stopId: "a", note: "  Recibió el hijo  " }, { type: "DELIVER", stopId: "a", at: T2 });
    expect(byId(d, "a")).toMatchObject({ status: "delivered", deliveredAt: T2, note: "Recibió el hijo" });
    expect(d.route.currentTargetId).toBeUndefined();
    expect(d.route.status).toBe("active");
  });

  it("llegar fija esa tienda como destino aunque no fuera la siguiente (entregar igual)", () => {
    const d = apply(data([stop("a"), stop("b")], { currentTargetId: "a" }), { type: "ARRIVE", stopId: "b", at: T1 });
    expect(d.route.currentTargetId).toBe("b");
    expect(d.route.stopOrder).toEqual(["b", "a"]);
  });

  it("una observación vacía no se guarda", () => {
    const d = apply(data([stop("a", { status: "delivering" })]), { type: "SET_NOTE", stopId: "a", note: "" });
    expect(byId(d, "a")?.note).toBeUndefined();
  });

  it("al entregar la última, la ruta queda finalizada", () => {
    const d = apply(data([stop("a", { status: "delivering" })]), { type: "DELIVER", stopId: "a", at: T2 });
    expect(d.route).toMatchObject({ status: "finished", finishedAt: T2 });
  });
});

describe("transiciones inválidas", () => {
  it("no se puede entregar sin haber llegado", () => {
    expect(reason(reduceDelivery(data([stop("a")]), { type: "DELIVER", stopId: "a", at: T1 }))).toBe("INVALID_STOP_STATUS");
  });

  it("no se puede llegar a una tienda ya entregada ni ir hacia ella", () => {
    const d = data([stop("a", { status: "delivered" }), stop("b")]);
    expect(reason(reduceDelivery(d, { type: "ARRIVE", stopId: "a", at: T1 }))).toBe("INVALID_STOP_STATUS");
    expect(reason(reduceDelivery(d, { type: "GO_TO", stopId: "a" }))).toBe("INVALID_STOP_STATUS");
  });

  it("solo una tienda puede estar entregándose a la vez", () => {
    const d = data([stop("a", { status: "delivering" }), stop("b")]);
    expect(reason(reduceDelivery(d, { type: "ARRIVE", stopId: "b", at: T1 }))).toBe("ANOTHER_STOP_IN_PROGRESS");
  });

  it("nada de entregas con la ruta sin iniciar", () => {
    const d = data([stop("a")], { status: "draft" });
    expect(reason(reduceDelivery(d, { type: "ARRIVE", stopId: "a", at: T1 }))).toBe("ROUTE_NOT_ACTIVE");
    expect(reason(reduceDelivery(d, { type: "GO_TO", stopId: "a" }))).toBe("ROUTE_NOT_ACTIVE");
  });

  it("rechaza tiendas inexistentes y observaciones fuera de la entrega", () => {
    expect(reason(reduceDelivery(data([stop("a")]), { type: "ARRIVE", stopId: "zzz", at: T1 }))).toBe("STOP_NOT_FOUND");
    expect(reason(reduceDelivery(data([stop("a")]), { type: "SET_NOTE", stopId: "a", note: "x" }))).toBe("INVALID_STOP_STATUS");
  });
});

describe("deshacer", () => {
  it("devuelve una entregada a pendiente y limpia sus marcas de tiempo", () => {
    const d = apply(data([stop("a", { status: "delivered", arrivedAt: T1, deliveredAt: T2, note: "ok" }), stop("b")]), {
      type: "UNDO", stopId: "a", at: T2,
    });
    expect(byId(d, "a")).toMatchObject({ status: "pending", note: "ok" });
    expect(byId(d, "a")?.arrivedAt).toBeUndefined();
    expect(byId(d, "a")?.deliveredAt).toBeUndefined();
  });

  it("deshacer en una ruta finalizada la reabre", () => {
    const d = apply(data([stop("a", { status: "delivered" })], { status: "finished", finishedAt: T2 }), {
      type: "UNDO", stopId: "a", at: T2,
    });
    expect(d.route.status).toBe("active");
    expect(d.route.finishedAt).toBeUndefined();
  });

  it("no hay nada que deshacer en una pendiente", () => {
    expect(reason(reduceDelivery(data([stop("a")]), { type: "UNDO", stopId: "a", at: T1 }))).toBe("INVALID_STOP_STATUS");
  });
});

describe("settleRoute", () => {
  it("finaliza si se eliminó la última pendiente y reabre si se agrega una tienda", () => {
    const finished = settleRoute(data([stop("a", { status: "delivered" })]), T2);
    expect(finished.route.status).toBe("finished");
    const reopened = settleRoute({ ...finished, stops: [...finished.stops, stop("b")] }, T2);
    expect(reopened.route.status).toBe("active");
  });

  it("no toca un borrador ni una ruta activa con pendientes; sin tiendas vuelve a borrador", () => {
    expect(settleRoute(data([stop("a")], { status: "draft" }), T2).route.status).toBe("draft");
    expect(settleRoute(data([stop("a")]), T2).route.status).toBe("active");
    expect(settleRoute(data([]), T2).route.status).toBe("draft");
  });
});
