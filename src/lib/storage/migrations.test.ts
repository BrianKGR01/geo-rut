import { describe, expect, it } from "vitest";
import { migratePersisted, repairConsistency } from "./migrations";
import { emptyAppData, SCHEMA_VERSION } from "./schema";

const v1Stop = {
  id: "a",
  name: "Bodega Ana",
  lat: -12.05,
  lng: -77.04,
  coordsSource: "link-exact",
  status: "pending",
  orderItems: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("migratePersisted", () => {
  it("acepta un estado de la versión actual sin cambiarlo", () => {
    const state = {
      stops: [v1Stop],
      route: { status: "draft", stopOrder: ["a"], orderMode: "manual" },
      settings: { theme: "dark", startMode: "gps" },
    };
    const result = migratePersisted(state, SCHEMA_VERSION);
    expect(result.data.settings.theme).toBe("dark");
    expect(result.ok).toBe(true);
    expect(result.data.stops).toHaveLength(1);
    expect(result.data.route.stopOrder).toEqual(["a"]);
  });

  it("migra v0 agregando orderItems y orderMode", () => {
    const { orderItems: _omitted, ...v0Stop } = v1Stop;
    void _omitted;
    const state = { stops: [v0Stop], route: { status: "draft", stopOrder: ["a"] } };
    const result = migratePersisted(state, 0);
    expect(result.ok).toBe(true);
    expect(result.data.stops[0]?.orderItems).toEqual([]);
    expect(result.data.route.orderMode).toBe("manual");
  });

  it("migra v1 agregando los ajustes por defecto sin perder tiendas ni ruta", () => {
    const state = { stops: [v1Stop], route: { status: "active", stopOrder: ["a"], orderMode: "optimized" } };
    const result = migratePersisted(state, 1);
    expect(result.ok).toBe(true);
    expect(result.data.settings).toEqual({ theme: "auto", startMode: "gps" });
    expect(result.data.route.status).toBe("active");
    expect(result.data.stops).toHaveLength(1);
  });

  it("devuelve estado vacío y ok=false ante datos corruptos", () => {
    expect(migratePersisted("basura", 2)).toEqual({ ok: false, data: emptyAppData() });
    expect(migratePersisted({ stops: [{ id: 1 }], route: {} }, 2).ok).toBe(false);
  });

  it("rechaza versiones futuras que no sabe leer", () => {
    expect(migratePersisted(emptyAppData(), SCHEMA_VERSION + 1).ok).toBe(false);
  });

  it("descarta un legsCache inválido sin perder las tiendas", () => {
    const state = {
      stops: [v1Stop],
      route: { status: "draft", stopOrder: ["a"], orderMode: "manual", legsCache: { roto: true } },
    };
    const result = migratePersisted(state, 1);
    expect(result.ok).toBe(true);
    expect(result.data.route.legsCache).toBeUndefined();
    expect(result.data.stops).toHaveLength(1);
  });
});

describe("repairConsistency", () => {
  it("quita ids desconocidos o repetidos y agrega los que faltan", () => {
    const data = emptyAppData();
    const stop = { ...v1Stop, coordsSource: "manual" as const, status: "pending" as const };
    const repaired = repairConsistency({
      ...data,
      stops: [stop, { ...stop, id: "b" }],
      route: { ...data.route, stopOrder: ["zzz", "b", "b"], currentTargetId: "zzz" },
    });
    expect(repaired.route.stopOrder).toEqual(["b", "a"]);
    expect(repaired.route.currentTargetId).toBeUndefined();
  });
});
