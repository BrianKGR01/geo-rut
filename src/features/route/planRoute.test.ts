import { describe, expect, it, vi } from "vitest";
import { haversineProvider } from "@/lib/routing/haversineProvider";
import type { RoutingProvider } from "@/lib/routing/types";
import type { AppData, Stop } from "@/types/domain";
import { applyOptimizedOrder, reorderManually } from "./orderOps";
import {
  computeLegsCache,
  currentRouteRequest,
  legByStopId,
  optimizePendingOrder,
  routeOrigin,
  routeTotals,
} from "./planRoute";

const stop = (id: string, lat: number, extra: Partial<Stop> = {}): Stop => ({
  id,
  name: id,
  lat,
  lng: -77,
  coordsSource: "manual",
  status: "pending",
  orderItems: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const data = (stops: Stop[], route: Partial<AppData["route"]> = {}): AppData => ({
  stops,
  route: { status: "draft", stopOrder: stops.map((s) => s.id), orderMode: "manual", ...route },
});

const broken: RoutingProvider = {
  getMatrix: async () => { throw new Error("OSRM caído"); },
  getRoute: async () => { throw new Error("OSRM caído"); },
};
const START = { lat: -12, lng: -77, capturedAt: "2026-01-01T10:00:00.000Z" };

describe("routeOrigin", () => {
  it("usa el punto de partida si no hay entregas", () => {
    expect(routeOrigin(data([stop("a", -12.1)], { startPoint: START }))).toEqual(START);
    expect(routeOrigin(data([stop("a", -12.1)]))).toBeUndefined();
  });

  it("parte de la última tienda entregada", () => {
    const stops = [
      stop("a", -12.1, { status: "delivered", deliveredAt: "2026-01-01T11:00:00.000Z" }),
      stop("b", -12.2, { status: "delivered", deliveredAt: "2026-01-01T12:00:00.000Z" }),
      stop("c", -12.3),
    ];
    expect(routeOrigin(data(stops, { startPoint: START }))).toEqual({ lat: -12.2, lng: -77 });
  });

  it("prefiere el punto de partida si se capturó después de la última entrega (re-optimizar)", () => {
    const stops = [stop("a", -12.1, { status: "delivered", deliveredAt: "2026-01-01T11:00:00.000Z" })];
    const later = { ...START, capturedAt: "2026-01-01T11:30:00.000Z" };
    expect(routeOrigin(data(stops, { startPoint: later }))).toEqual(later);
  });
});

describe("currentRouteRequest", () => {
  it("no pide ruta con menos de dos puntos", () => {
    expect(currentRouteRequest(data([stop("a", -12.1)]))).toBeNull();
    expect(currentRouteRequest(data([stop("a", -12.1)], { startPoint: START }))).not.toBeNull();
  });

  it("la clave cambia con el orden y con las coordenadas, no con el nombre", () => {
    const stops = [stop("a", -12.1), stop("b", -12.2)];
    const key = currentRouteRequest(data(stops))?.key;
    expect(currentRouteRequest(data(stops, { stopOrder: ["b", "a"] }))?.key).not.toBe(key);
    expect(currentRouteRequest(data([stop("a", -12.15), stop("b", -12.2)]))?.key).not.toBe(key);
    expect(currentRouteRequest(data([stop("a", -12.1, { name: "otro" }), stop("b", -12.2)]))?.key).toBe(key);
  });

  it("deja fuera las entregadas", () => {
    const stops = [stop("a", -12.1, { status: "delivered", deliveredAt: "2026-01-01T11:00:00.000Z" }), stop("b", -12.2)];
    expect(currentRouteRequest(data(stops))?.stops.map((s) => s.id)).toEqual(["b"]);
  });
});

describe("computeLegsCache", () => {
  const request = currentRouteRequest(data([stop("a", -12.1), stop("b", -12.2)], { startPoint: START }));

  it("respeta el orden exacto y marca la ruta como real", async () => {
    const getRoute = vi.fn(haversineProvider.getRoute);
    const cache = await computeLegsCache(request!, { primary: { ...haversineProvider, getRoute }, fallback: haversineProvider });
    expect(getRoute.mock.calls[0]?.[0].map((p) => p.lat)).toEqual([-12, -12.1, -12.2]);
    expect(cache).toMatchObject({ approximate: false, hasOrigin: true, stopIds: ["a", "b"] });
    expect(cache.legs).toHaveLength(2);
  });

  it("cae a líneas rectas y avisa cuando el servicio está caído", async () => {
    const cache = await computeLegsCache(request!, { primary: broken, fallback: haversineProvider });
    expect(cache.approximate).toBe(true);
    expect(cache.legs).toHaveLength(2);
  });
});

describe("optimizePendingOrder", () => {
  const pending = [stop("lejos", -12.3), stop("cerca", -12.1), stop("medio", -12.2)];

  it("ordena desde la ubicación actual", async () => {
    const result = await optimizePendingOrder(pending, START, { primary: haversineProvider, fallback: haversineProvider });
    expect(result).toEqual({ stopIds: ["cerca", "medio", "lejos"], approximate: false });
  });

  it("sin ubicación deja fija la primera tienda", async () => {
    const result = await optimizePendingOrder(pending, undefined, { primary: haversineProvider, fallback: haversineProvider });
    expect(result.stopIds).toEqual(["lejos", "medio", "cerca"]);
  });

  it("sigue funcionando con el servicio caído", async () => {
    const result = await optimizePendingOrder(pending, START, { primary: broken, fallback: haversineProvider });
    expect(result).toEqual({ stopIds: ["cerca", "medio", "lejos"], approximate: true });
  });
});

describe("tramos y totales", () => {
  const cache = {
    key: "k", stopIds: ["a", "b"], geometry: "", approximate: false,
    legs: [{ distanceM: 1000, durationS: 120 }, { distanceM: 500, durationS: 60 }],
  };

  it("con origen cada tienda tiene su tramo de llegada", () => {
    expect(legByStopId({ ...cache, hasOrigin: true }).get("a")?.distanceM).toBe(1000);
    expect(routeTotals({ ...cache, hasOrigin: true })).toEqual({ distanceM: 1500, durationS: 180 });
  });

  it("sin origen la primera tienda no tiene tramo", () => {
    const legs = legByStopId({ ...cache, hasOrigin: false, legs: [cache.legs[0]!] });
    expect(legs.has("a")).toBe(false);
    expect(legs.get("b")?.distanceM).toBe(1000);
  });
});

describe("orden", () => {
  const stops = [
    stop("d", -12, { status: "delivered", deliveredAt: "2026-01-01T11:00:00.000Z" }),
    stop("a", -12.1),
    stop("b", -12.2, { status: "delivering" }),
    stop("c", -12.3),
  ];

  it("reordenar a mano pone modo manual y mantiene las entregadas al inicio", () => {
    const next = reorderManually(data(stops, { orderMode: "optimized" }), ["c", "a", "b"]);
    expect(next.route.stopOrder).toEqual(["d", "c", "a", "b"]);
    expect(next.route.orderMode).toBe("manual");
  });

  it("nunca pierde tiendas aunque el orden recibido venga incompleto o con basura", () => {
    const next = reorderManually(data(stops), ["c", "zzz", "c"]);
    expect(next.route.stopOrder).toEqual(["d", "c", "a", "b"]);
  });

  it("optimizar deja primero la que se está entregando y guarda el punto de partida", () => {
    const next = applyOptimizedOrder(data(stops), ["c", "a"], START);
    expect(next.route.stopOrder).toEqual(["d", "b", "c", "a"]);
    expect(next.route.orderMode).toBe("optimized");
    expect(next.route.startPoint).toEqual(START);
  });
});
