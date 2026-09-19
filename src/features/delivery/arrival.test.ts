import { describe, expect, it } from "vitest";
import { ARRIVAL_RADIUS_M, evaluateArrival } from "./arrival";
import { googleMapsDirectionsUrl } from "./mapsLink";

const target = { lat: -12.05, lng: -77.04 };
// 0.001° de latitud ≈ 111 m
const at = (metersNorth: number, accuracy: number) => ({
  lat: target.lat + metersNorth / 111_195,
  lng: target.lng,
  accuracy,
});

describe("evaluateArrival", () => {
  it("marca llegada cuando la distancia es menor al radio y el GPS es confiable", () => {
    expect(evaluateArrival(at(60, 20), target)).toBe("arrived");
    expect(evaluateArrival(at(ARRIVAL_RADIUS_M - 1, 150), target)).toBe("arrived");
  });

  it("no marca llegada fuera del radio", () => {
    expect(evaluateArrival(at(ARRIVAL_RADIUS_M + 5, 20), target)).toBe("none");
    expect(evaluateArrival(at(2000, 20), target)).toBe("none");
  });

  it("con precisión peor a 150 m pregunta en vez de marcar sola", () => {
    expect(evaluateArrival(at(30, 151), target)).toBe("ask");
    expect(evaluateArrival(at(400, 300), target)).toBe("ask");
  });

  it("con GPS impreciso pero claramente lejos no molesta", () => {
    expect(evaluateArrival(at(5000, 300), target)).toBe("none");
  });

  it("sin posición o sin destino no hace nada", () => {
    expect(evaluateArrival(undefined, target)).toBe("none");
    expect(evaluateArrival(at(0, 10), undefined)).toBe("none");
  });

  it("el radio es configurable", () => {
    expect(evaluateArrival(at(200, 20), target, 250)).toBe("arrived");
  });
});

describe("googleMapsDirectionsUrl", () => {
  it("arma el deep link documentado por Google con destino lat,lng", () => {
    expect(googleMapsDirectionsUrl({ lat: -12.0464, lng: -77.0428 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-12.046400%2C-77.042800&travelmode=driving",
    );
  });
});
