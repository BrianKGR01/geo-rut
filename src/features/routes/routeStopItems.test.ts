import { describe, expect, it } from "vitest";
import { mapRouteStopItemRow, routeStopItemRowSchema } from "./routeStopItems";

describe("mapRouteStopItemRow", () => {
  it("mapea una fila con cantidad cargada", () => {
    const row = routeStopItemRowSchema.parse({
      id: "item-1",
      route_stop_id: "stop-1",
      description: "Arroz 5kg",
      quantity: 3,
      position: 0,
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapRouteStopItemRow(row)).toEqual({
      id: "item-1",
      routeStopId: "stop-1",
      description: "Arroz 5kg",
      quantity: 3,
      position: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("quantity null se mantiene null (partida sin cantidad todavía)", () => {
    const row = routeStopItemRowSchema.parse({
      id: "item-2",
      route_stop_id: "stop-1",
      description: "Caja de aceite",
      quantity: null,
      position: 1,
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapRouteStopItemRow(row).quantity).toBeNull();
  });
});
