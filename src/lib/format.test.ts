import { describe, expect, it } from "vitest";
import { formatDateTime, formatDistance, formatDuration, formatTime } from "./format";

describe("formato", () => {
  it("distancias cortas en metros y largas en km con coma decimal", () => {
    expect(formatDistance(84)).toBe("80 m");
    expect(formatDistance(3)).toBe("10 m");
    expect(formatDistance(12_440)).toBe("12,4 km");
  });

  it("duraciones en minutos y horas", () => {
    expect(formatDuration(20)).toBe("1 min");
    expect(formatDuration(35 * 60)).toBe("35 min");
    expect(formatDuration(3600)).toBe("1 h");
    expect(formatDuration(80 * 60)).toBe("1 h 20 min");
  });

  it("hora inválida o ausente muestra raya", () => {
    expect(formatTime(undefined)).toBe("—");
    expect(formatTime("no es fecha")).toBe("—");
  });

  it("fecha y hora inválida o ausente muestra raya", () => {
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDateTime("no es fecha")).toBe("—");
  });
});
