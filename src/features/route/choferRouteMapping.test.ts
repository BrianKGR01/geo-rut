import { describe, expect, it } from "vitest";
import type { RouteStopDetail, RouteWithStops } from "@/features/routes/api";
import { reduceDelivery } from "@/features/delivery/reducer";
import { groupStops, nextStop } from "./selectors";
import { applyDeliveryResult, buildChoferRouteData, toAppData } from "./choferRouteMapping";

function stopDetail(overrides: Partial<RouteStopDetail> = {}): RouteStopDetail {
  return {
    id: "stop-1",
    routeId: "route-1",
    storeId: "store-1",
    name: "Tienda 1",
    lat: -12.05,
    lng: -77.04,
    position: 0,
    status: "pending",
    pedidoMonto: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    items: [],
    images: [],
    ...overrides,
  };
}

function route(stops: RouteStopDetail[]): RouteWithStops {
  return {
    id: "route-1",
    driverId: "driver-1",
    status: "active",
    orderMode: "manual",
    driverCode: "AB23CD",
    createdBy: "admin-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    startedAt: "2026-01-01T00:00:00.000Z",
    stops,
  };
}

describe("buildChoferRouteData", () => {
  it("mapea las tiendas conservando el pedido y usa position como stopOrder", () => {
    const data = buildChoferRouteData(
      route([
        stopDetail({ id: "a", position: 0, pedidoMonto: 120 }),
        stopDetail({ id: "b", position: 1 }),
      ]),
    );
    expect(data.route.stopOrder).toEqual(["a", "b"]);
    expect(data.stops[0]).toMatchObject({ id: "a", pedidoMonto: 120 });
  });

  it("no persiste currentTargetId ni legsCache/startPoint (RLS no deja al chofer escribir routes)", () => {
    const data = buildChoferRouteData(route([stopDetail()]));
    expect(data.route.currentTargetId).toBeUndefined();
    expect(data.route.legsCache).toBeUndefined();
    expect(data.route.startPoint).toBeUndefined();
  });
});

describe("applyDeliveryResult", () => {
  it("al marcar llegada, la tienda pasa al frente del stopOrder y conserva el pedido", () => {
    const current = buildChoferRouteData(
      route([
        stopDetail({ id: "a", position: 0 }),
        stopDetail({ id: "b", position: 1, pedidoMonto: 50, items: [{ id: "i1", routeStopId: "b", description: "Caja", quantity: 2, position: 0, createdAt: "2026-01-01T00:00:00.000Z" }] }),
      ]),
    );
    const result = reduceDelivery(toAppData(current), { type: "ARRIVE", stopId: "b", at: "2026-01-01T10:00:00.000Z" });
    if (!result.ok) throw new Error("se esperaba que la llegada se aceptara");

    const next = applyDeliveryResult(current, result.data);
    expect(next.route.stopOrder).toEqual(["b", "a"]);
    const stopB = next.stops.find((stop) => stop.id === "b");
    expect(stopB).toMatchObject({ status: "delivering", pedidoMonto: 50 });
    expect(stopB?.items).toHaveLength(1);
  });

  it("nunca deja que el reductor cambie el status de la ruta (eso lo decide el administrador)", () => {
    const current = buildChoferRouteData(route([stopDetail({ id: "a", status: "delivering", arrivedAt: "2026-01-01T09:00:00.000Z" })]));
    const result = reduceDelivery(toAppData(current), { type: "DELIVER", stopId: "a", at: "2026-01-01T10:00:00.000Z" });
    if (!result.ok) throw new Error("se esperaba que la entrega se aceptara");

    // El reductor de v1 pondría route.status = "finished" acá (última tienda entregada); se descarta.
    expect(result.data.route.status).toBe("finished");
    const next = applyDeliveryResult(current, result.data);
    expect(next.route.status).toBe("active");
  });
});

describe("selectores reusados sobre ChoferRouteData", () => {
  it("groupStops/nextStop funcionan igual que con Stop de v1", () => {
    const data = buildChoferRouteData(
      route([stopDetail({ id: "a", position: 0 }), stopDetail({ id: "b", position: 1, status: "delivered", deliveredAt: "x" })]),
    );
    const groups = groupStops(data);
    expect(groups.delivered.map((stop) => stop.id)).toEqual(["b"]);
    expect(groups.remaining.map((stop) => stop.id)).toEqual(["a"]);
    expect(nextStop(data)?.id).toBe("a");
  });
});
