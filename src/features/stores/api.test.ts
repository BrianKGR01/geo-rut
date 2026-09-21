import { describe, expect, it } from "vitest";
import { mapStoreRow, storeRowSchema } from "./api";

describe("mapStoreRow", () => {
  it("mapea una fila completa a StoreRecord", () => {
    const row = storeRowSchema.parse({
      id: "s1",
      name: "Bodega Ana",
      lat: -12.05,
      lng: -77.04,
      coords_source: "link-exact",
      source_url: "https://maps.app.goo.gl/abc",
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapStoreRow(row)).toEqual({
      id: "s1",
      name: "Bodega Ana",
      lat: -12.05,
      lng: -77.04,
      coordsSource: "link-exact",
      sourceUrl: "https://maps.app.goo.gl/abc",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("un source_url null se mapea a undefined", () => {
    const row = storeRowSchema.parse({
      id: "s2",
      name: "Minimarket Sol",
      lat: -12.0,
      lng: -77.0,
      coords_source: "manual",
      source_url: null,
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapStoreRow(row).sourceUrl).toBeUndefined();
  });

  it("rechaza un coords_source fuera del enum del dominio", () => {
    expect(() =>
      storeRowSchema.parse({
        id: "s3",
        name: "Tienda",
        lat: -12,
        lng: -77,
        coords_source: "gps",
        source_url: null,
        created_at: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();
  });
});
