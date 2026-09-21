import { describe, expect, it } from "vitest";
import { driverRowSchema, mapDriverRow } from "./api";

describe("mapDriverRow", () => {
  it("mapea una fila con teléfono a Driver", () => {
    const row = driverRowSchema.parse({
      id: "d1",
      name: "Juan Pérez",
      phone: "70011122",
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapDriverRow(row)).toEqual({
      id: "d1",
      name: "Juan Pérez",
      phone: "70011122",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("un teléfono null se mapea a undefined, no a null", () => {
    const row = driverRowSchema.parse({
      id: "d2",
      name: "Ana Gómez",
      phone: null,
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapDriverRow(row).phone).toBeUndefined();
  });

  it("rechaza una fila sin nombre", () => {
    expect(() =>
      driverRowSchema.parse({ id: "d3", phone: null, created_at: "2026-01-01T00:00:00.000Z" }),
    ).toThrow();
  });
});
