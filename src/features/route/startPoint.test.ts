import { describe, expect, it } from "vitest";
import { defaultSettings, emptyAppData } from "@/lib/storage/schema";
import type { AppData } from "@/types/domain";
import { chooseFixedStart, chooseGpsStart, freshRoute, plannedOrigin } from "./startPoint";

const AT = "2026-01-01T10:00:00.000Z";
const BASE = { lat: -17.78, lng: -63.18, label: "Depósito" };
const GPS = { lat: -17.8, lng: -63.2 };

describe("punto de partida", () => {
  it("elegir un punto fijo lo guarda en ajustes y lo usa como partida del borrador", () => {
    const next = chooseFixedStart(emptyAppData(), BASE, AT);
    expect(next.settings).toMatchObject({ startMode: "fixed", fixedStart: BASE });
    expect(next.route.startPoint).toEqual({ lat: BASE.lat, lng: BASE.lng, capturedAt: AT });
  });

  it("con la ruta en curso cambia el ajuste pero no mueve la partida de esta ruta", () => {
    const active: AppData = { ...emptyAppData(), route: { ...emptyAppData().route, status: "active" } };
    const next = chooseFixedStart(active, BASE, AT);
    expect(next.settings.startMode).toBe("fixed");
    expect(next.route.startPoint).toBeUndefined();
  });

  it("volver a 'mi ubicación' usa la posición conocida o espera a tenerla", () => {
    const fixed = chooseFixedStart(emptyAppData(), BASE, AT);
    expect(chooseGpsStart(fixed, GPS, AT).route.startPoint).toMatchObject(GPS);
    const waiting = chooseGpsStart(fixed, undefined, AT);
    expect(waiting.route.startPoint).toBeUndefined();
    expect(waiting.settings.fixedStart).toEqual(BASE); // se recuerda para volver a elegirlo
  });

  it("una ruta nueva nace con la partida fija", () => {
    expect(freshRoute(defaultSettings(), AT).startPoint).toBeUndefined();
    const settings = { ...defaultSettings(), startMode: "fixed" as const, fixedStart: BASE };
    expect(freshRoute(settings, AT).startPoint).toMatchObject({ lat: BASE.lat, lng: BASE.lng });
  });
});

describe("plannedOrigin", () => {
  it("antes de salir manda la partida elegida", () => {
    expect(plannedOrigin(emptyAppData(), GPS)).toEqual(GPS);
    expect(plannedOrigin(emptyAppData(), undefined)).toBeUndefined();
    expect(plannedOrigin(chooseFixedStart(emptyAppData(), BASE, AT), GPS)).toEqual({ lat: BASE.lat, lng: BASE.lng });
  });

  it("con la ruta en curso manda dónde está el repartidor", () => {
    const fixed = chooseFixedStart(emptyAppData(), BASE, AT);
    const active: AppData = { ...fixed, route: { ...fixed.route, status: "active" } };
    expect(plannedOrigin(active, GPS)).toEqual(GPS);
    expect(plannedOrigin(active, undefined)).toMatchObject({ lat: BASE.lat, lng: BASE.lng });
  });
});
