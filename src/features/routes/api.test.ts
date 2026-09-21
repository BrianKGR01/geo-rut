import { describe, expect, it } from "vitest";
import { assembleRouteWithStops, formatRouteLabel, mapRouteRow, routeRowSchema, type RouteSummary } from "./api";

function baseRouteRow() {
  return {
    id: "r1",
    driver_id: "d1",
    status: "active" as const,
    order_mode: "manual" as const,
    driver_code: "AB23CD",
    start_point: null,
    legs_cache: null,
    created_by: "u1",
    created_at: "2026-01-01T00:00:00.000Z",
    started_at: "2026-01-01T01:00:00.000Z",
    finished_at: null,
  };
}

describe("mapRouteRow", () => {
  it("mapea una fila completa, con start_point válido", () => {
    const row = routeRowSchema.parse({
      ...baseRouteRow(),
      start_point: { lat: -12.05, lng: -77.04, capturedAt: "2026-01-01T00:30:00.000Z" },
    });

    expect(mapRouteRow(row)).toEqual({
      id: "r1",
      driverId: "d1",
      status: "active",
      orderMode: "manual",
      driverCode: "AB23CD",
      startPoint: { lat: -12.05, lng: -77.04, capturedAt: "2026-01-01T00:30:00.000Z" },
      legsCache: undefined,
      createdBy: "u1",
      createdAt: "2026-01-01T00:00:00.000Z",
      startedAt: "2026-01-01T01:00:00.000Z",
      finishedAt: undefined,
    });
  });

  it("un start_point con forma inválida se descarta (no tumba el resto de la fila)", () => {
    const row = routeRowSchema.parse({ ...baseRouteRow(), start_point: { lat: "no-numero" } });
    expect(mapRouteRow(row).startPoint).toBeUndefined();
  });

  it("driver_id y finished_at null se mapean sin romper (ruta sin asignar, no terminada)", () => {
    const row = routeRowSchema.parse({ ...baseRouteRow(), driver_id: null });
    const mapped = mapRouteRow(row);
    expect(mapped.driverId).toBeNull();
    expect(mapped.finishedAt).toBeUndefined();
  });
});

describe("assembleRouteWithStops", () => {
  const route: RouteSummary = mapRouteRow(routeRowSchema.parse(baseRouteRow()));

  it("ordena tiendas, partidas y fotos por posición/fecha", () => {
    const stopRows = [
      {
        id: "stop-2",
        route_id: "r1",
        store_id: null,
        name: "Segunda",
        lat: -12.1,
        lng: -77.1,
        position: 1,
        status: "pending" as const,
        note: null,
        pedido_monto: null,
        arrived_at: null,
        delivered_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        route_stop_items: [],
        route_stop_images: [],
      },
      {
        id: "stop-1",
        route_id: "r1",
        store_id: "s1",
        name: "Primera",
        lat: -12.0,
        lng: -77.0,
        position: 0,
        status: "pending" as const,
        note: null,
        pedido_monto: 25,
        arrived_at: null,
        delivered_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        route_stop_items: [
          {
            id: "item-2",
            route_stop_id: "stop-1",
            description: "Segundo item",
            quantity: null,
            position: 1,
            created_at: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "item-1",
            route_stop_id: "stop-1",
            description: "Primer item",
            quantity: 3,
            position: 0,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        route_stop_images: [
          {
            id: "img-2",
            route_stop_id: "stop-1",
            storage_path: "r1/stop-1/b.jpg",
            uploaded_by: "u1",
            uploaded_role: "admin" as const,
            created_at: "2026-01-01T00:02:00.000Z",
          },
          {
            id: "img-1",
            route_stop_id: "stop-1",
            storage_path: "r1/stop-1/a.jpg",
            uploaded_by: "u2",
            uploaded_role: "chofer" as const,
            created_at: "2026-01-01T00:01:00.000Z",
          },
        ],
      },
    ];

    const result = assembleRouteWithStops(route, stopRows);

    expect(result.stops.map((stop) => stop.id)).toEqual(["stop-1", "stop-2"]);
    expect(result.stops[0]?.items.map((item) => item.id)).toEqual(["item-1", "item-2"]);
    expect(result.stops[0]?.images.map((image) => image.id)).toEqual(["img-1", "img-2"]);
    expect(result.stops[0]?.pedidoMonto).toBe(25);
    expect(result.stops[1]?.items).toEqual([]);
  });
});

describe("formatRouteLabel", () => {
  it("usa el nombre del chofer cuando hay uno asignado", () => {
    expect(formatRouteLabel("Juan Pérez", "2026-01-01T00:00:00.000Z")).toMatch(/^Juan Pérez — /);
  });

  it("dice 'Sin asignar' cuando no hay chofer", () => {
    expect(formatRouteLabel(undefined, "2026-01-01T00:00:00.000Z")).toMatch(/^Sin asignar — /);
  });
});
