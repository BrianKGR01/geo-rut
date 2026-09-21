import { describe, expect, it } from "vitest";
import { adminRowSchema, canDeactivateAdmin, mapAdminRow } from "./api";

describe("mapAdminRow", () => {
  it("mapea una fila completa", () => {
    const row = adminRowSchema.parse({
      user_id: "u1",
      display_name: "Ana Gómez",
      invited_by: "u0",
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapAdminRow(row)).toEqual({
      userId: "u1",
      displayName: "Ana Gómez",
      invitedBy: "u0",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("display_name e invited_by null se mapean sin romper (primer admin, sin nombre)", () => {
    const row = adminRowSchema.parse({
      user_id: "u1",
      display_name: null,
      invited_by: null,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    const mapped = mapAdminRow(row);
    expect(mapped.displayName).toBeUndefined();
    expect(mapped.invitedBy).toBeNull();
  });
});

describe("canDeactivateAdmin", () => {
  it("bloquea quitarse a uno mismo si es el único admin activo", () => {
    expect(canDeactivateAdmin("u1", "u1", 1)).toBe(false);
  });

  it("permite quitarse a uno mismo si hay otro admin activo", () => {
    expect(canDeactivateAdmin("u1", "u1", 2)).toBe(true);
  });

  it("permite quitar a otro admin aunque uno mismo sea el único activo además de él", () => {
    expect(canDeactivateAdmin("u2", "u1", 2)).toBe(true);
  });
});
