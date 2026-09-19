import { describe, expect, it, vi } from "vitest";
import { haversineProvider } from "./haversineProvider";
import { createOsrmProvider } from "./osrm";
import { decodePolyline, encodePolyline } from "./polyline";

const A = { lat: -12.0464, lng: -77.0428 };
const B = { lat: -12.06, lng: -77.03 };
const C = { lat: -12.07, lng: -77.05 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("polyline", () => {
  it("decodifica el ejemplo de referencia de Google", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });

  it("codificar y decodificar es ida y vuelta", () => {
    const points: [number, number][] = [[A.lat, A.lng], [B.lat, B.lng], [C.lat, C.lng]];
    expect(decodePolyline(encodePolyline(points))).toEqual(points);
  });

  it("no revienta con texto corrupto", () => {
    expect(() => decodePolyline("???")).not.toThrow();
    expect(decodePolyline("")).toEqual([]);
  });
});

describe("OSRM", () => {
  it("pide la matriz en orden lng,lat y rellena los null con una estimación", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => json({ code: "Ok", durations: [[0, 100], [null, 0]] }));
    const matrix = await createOsrmProvider(fetchMock).getMatrix([A, B]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://router.project-osrm.org/table/v1/driving/-77.042800,-12.046400;-77.030000,-12.060000?annotations=duration",
    );
    expect(matrix[0]).toEqual([0, 100]);
    expect(matrix[1]?.[0]).toBeGreaterThan(0);
  });

  it("devuelve geometría y un tramo por par de puntos", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () =>
      json({
        code: "Ok",
        routes: [{ geometry: "abc", legs: [{ distance: 3343.2, duration: 385.9 }, { distance: 2875.2, duration: 342.7 }] }],
      }),
    );
    const route = await createOsrmProvider(fetchMock).getRoute([A, B, C]);
    expect(route.geometry).toBe("abc");
    expect(route.legs).toEqual([
      { distanceM: 3343.2, durationS: 385.9 },
      { distanceM: 2875.2, durationS: 342.7 },
    ]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("overview=full&geometries=polyline&steps=false");
  });

  it.each([
    ["código de error", () => json({ code: "NoRoute", message: "x" })],
    ["HTTP 500", () => json({}, 500)],
    ["forma inesperada", () => json({ code: "Ok", routes: [] })],
    ["tramos que no cuadran", () => json({ code: "Ok", routes: [{ geometry: "a", legs: [] }] })],
  ])("rechaza respuestas inválidas: %s", async (_name, respond) => {
    const provider = createOsrmProvider(async () => respond());
    await expect(provider.getRoute([A, B])).rejects.toThrow();
  });
});

describe("haversineProvider", () => {
  it("da una matriz cuadrada con diagonal 0 y líneas rectas", async () => {
    const matrix = await haversineProvider.getMatrix([A, B, C]);
    expect(matrix).toHaveLength(3);
    expect(matrix[1]?.[1]).toBe(0);
    const route = await haversineProvider.getRoute([A, B, C]);
    expect(route.legs).toHaveLength(2);
    expect(decodePolyline(route.geometry)).toHaveLength(3);
  });
});
