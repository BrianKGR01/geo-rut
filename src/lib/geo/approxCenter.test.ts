import { describe, expect, it } from "vitest";
import { centerFromGeoHeaders, centerFromTimeZone, FALLBACK_CENTER } from "./approxCenter";

describe("centro aproximado del mapa", () => {
  it("usa la zona horaria para mostrar el país", () => {
    expect(centerFromTimeZone("America/La_Paz").lat).toBeCloseTo(-17.2);
    expect(centerFromTimeZone("Asia/Tokyo")).toEqual(FALLBACK_CENTER);
    expect(centerFromTimeZone(undefined)).toEqual(FALLBACK_CENTER);
  });

  it("lee la ubicación por IP que agrega Vercel", () => {
    const headers = new Headers({ "x-vercel-ip-latitude": "-17.7863", "x-vercel-ip-longitude": "-63.1812" });
    expect(centerFromGeoHeaders(headers)).toEqual({ lat: -17.7863, lng: -63.1812, zoom: 12 });
  });

  it("ignora encabezados ausentes o basura", () => {
    expect(centerFromGeoHeaders(new Headers())).toBeNull();
    expect(centerFromGeoHeaders(new Headers({ "x-vercel-ip-latitude": "abc", "x-vercel-ip-longitude": "1" }))).toBeNull();
    expect(centerFromGeoHeaders(new Headers({ "x-vercel-ip-latitude": "999", "x-vercel-ip-longitude": "1" }))).toBeNull();
  });
});
