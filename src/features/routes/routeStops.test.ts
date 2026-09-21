import { describe, expect, it } from "vitest";
import {
  mapRouteStopRow,
  mergeRouteStopLiveStates,
  optimizedRouteOrder,
  pedidoMontoInputSchema,
  routeStopRowSchema,
  type RouteStopLiveState,
} from "./routeStops";

function baseRow() {
  return {
    id: "stop-1",
    route_id: "route-1",
    store_id: "store-1",
    name: "Bodega Ana",
    lat: -12.05,
    lng: -77.04,
    position: 0,
    status: "pending" as const,
    note: null,
    pedido_monto: null,
    arrived_at: null,
    delivered_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("mapRouteStopRow", () => {
  it("mapea una fila con pedido_monto, note, arrived_at y delivered_at cargados", () => {
    const row = routeStopRowSchema.parse({
      ...baseRow(),
      status: "delivered",
      note: "Dejar en portería",
      pedido_monto: 25,
      arrived_at: "2026-01-01T10:00:00.000Z",
      delivered_at: "2026-01-01T10:05:00.000Z",
    });

    expect(mapRouteStopRow(row)).toEqual({
      id: "stop-1",
      routeId: "route-1",
      storeId: "store-1",
      name: "Bodega Ana",
      lat: -12.05,
      lng: -77.04,
      position: 0,
      status: "delivered",
      note: "Dejar en portería",
      pedidoMonto: 25,
      arrivedAt: "2026-01-01T10:00:00.000Z",
      deliveredAt: "2026-01-01T10:05:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("los campos null (note/pedido_monto/arrived_at/delivered_at) se mapean como corresponde", () => {
    const row = routeStopRowSchema.parse(baseRow());
    const mapped = mapRouteStopRow(row);
    expect(mapped.note).toBeUndefined();
    expect(mapped.pedidoMonto).toBeNull();
    expect(mapped.arrivedAt).toBeUndefined();
    expect(mapped.deliveredAt).toBeUndefined();
    expect(mapped.storeId).toBe("store-1");
  });

  it("rechaza un status fuera de StopStatus", () => {
    expect(() => routeStopRowSchema.parse({ ...baseRow(), status: "cancelado" })).toThrow();
  });
});

describe("pedidoMontoInputSchema", () => {
  it("acepta null y múltiplos de 5", () => {
    expect(pedidoMontoInputSchema.parse(null)).toBeNull();
    expect(pedidoMontoInputSchema.parse(25)).toBe(25);
  });

  it("rechaza montos negativos, cero, o que no sean múltiplo de 5", () => {
    expect(() => pedidoMontoInputSchema.parse(0)).toThrow();
    expect(() => pedidoMontoInputSchema.parse(-5)).toThrow();
    expect(() => pedidoMontoInputSchema.parse(12)).toThrow();
  });
});

describe("mergeRouteStopLiveStates", () => {
  const stop = mapRouteStopRow(routeStopRowSchema.parse(baseRow()));

  it("pisa status/arrivedAt/deliveredAt de las tiendas que trae el sondeo, deja el resto igual", () => {
    const live: RouteStopLiveState[] = [
      {
        id: "stop-1",
        position: 0,
        status: "delivered",
        arrivedAt: "2026-01-01T10:00:00.000Z",
        deliveredAt: "2026-01-01T10:05:00.000Z",
      },
    ];

    const [merged] = mergeRouteStopLiveStates([stop], live);

    expect(merged).toEqual({ ...stop, status: "delivered", arrivedAt: "2026-01-01T10:00:00.000Z", deliveredAt: "2026-01-01T10:05:00.000Z" });
  });

  it("una tienda sin fila en el sondeo (borrada/agregada después) queda sin tocar", () => {
    const [merged] = mergeRouteStopLiveStates([stop], []);
    expect(merged).toBe(stop);
  });

  it("no pisa pedidoMonto/name/items/images: solo conoce status/arrivedAt/deliveredAt", () => {
    const detailed = { ...stop, pedidoMonto: 40, items: [{ id: "i1" }], images: [{ id: "img1" }] };
    const [merged] = mergeRouteStopLiveStates([detailed], [{ id: "stop-1", position: 0, status: "delivering" }]);
    expect(merged.pedidoMonto).toBe(40);
    expect(merged.items).toEqual([{ id: "i1" }]);
    expect(merged.images).toEqual([{ id: "img1" }]);
    expect(merged.status).toBe("delivering");
  });
});

describe("optimizedRouteOrder", () => {
  const stops = [
    { id: "d", status: "delivered" as const },
    { id: "a", status: "pending" as const },
    { id: "b", status: "delivering" as const },
    { id: "c", status: "pending" as const },
  ];

  it("deja primero las entregadas y luego las que se están entregando, en su orden actual", () => {
    expect(optimizedRouteOrder(stops, ["c", "a"])).toEqual(["d", "b", "c", "a"]);
  });

  it("con más de una entregada o en curso, conserva el orden relativo entre ellas", () => {
    const many = [
      { id: "d1", status: "delivered" as const },
      { id: "d2", status: "delivered" as const },
      { id: "e1", status: "delivering" as const },
      { id: "p", status: "pending" as const },
    ];
    expect(optimizedRouteOrder(many, ["p"])).toEqual(["d1", "d2", "e1", "p"]);
  });
});
