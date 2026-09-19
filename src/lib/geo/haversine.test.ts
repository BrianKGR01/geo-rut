import { describe, expect, it } from "vitest";
import { haversineMeters, isValidLatLng } from "./haversine";

describe("haversineMeters", () => {
  it("es 0 entre un punto y sí mismo", () => {
    expect(haversineMeters({ lat: -12, lng: -77 }, { lat: -12, lng: -77 })).toBe(0);
  });

  it("un grado de latitud mide ~111,2 km", () => {
    const meters = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(meters).toBeGreaterThan(111_000);
    expect(meters).toBeLessThan(111_400);
  });

  it("Lima–Arequipa ronda los 765 km", () => {
    const km = haversineMeters({ lat: -12.0464, lng: -77.0428 }, { lat: -16.409, lng: -71.5375 }) / 1000;
    expect(km).toBeGreaterThan(755);
    expect(km).toBeLessThan(775);
  });

  it("es simétrica", () => {
    const a = { lat: -12.05, lng: -77.04 };
    const b = { lat: -12.06, lng: -77.03 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe("isValidLatLng", () => {
  it("rechaza fuera de rango y no finitos", () => {
    expect(isValidLatLng(-12, -77)).toBe(true);
    expect(isValidLatLng(91, 0)).toBe(false);
    expect(isValidLatLng(0, -181)).toBe(false);
    expect(isValidLatLng(Number.NaN, 0)).toBe(false);
  });
});
