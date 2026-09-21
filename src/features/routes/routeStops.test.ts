import { describe, expect, it } from "vitest";
import { mapRouteStopRow, pedidoMontoInputSchema, routeStopRowSchema } from "./routeStops";

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
