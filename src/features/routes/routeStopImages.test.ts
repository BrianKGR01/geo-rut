import { describe, expect, it } from "vitest";
import { isPhotoLimitError, mapRouteStopImageRow, routeStopImageRowSchema } from "./routeStopImages";

describe("mapRouteStopImageRow", () => {
  it("mapea autoría y rol de quien subió la foto", () => {
    const row = routeStopImageRowSchema.parse({
      id: "img-1",
      route_stop_id: "stop-1",
      storage_path: "route-1/stop-1/foto.jpg",
      uploaded_by: "user-1",
      uploaded_role: "chofer",
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapRouteStopImageRow(row)).toEqual({
      id: "img-1",
      routeStopId: "stop-1",
      storagePath: "route-1/stop-1/foto.jpg",
      uploadedBy: "user-1",
      uploadedRole: "chofer",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("rechaza un uploaded_role fuera de admin/chofer", () => {
    expect(() =>
      routeStopImageRowSchema.parse({
        id: "img-2",
        route_stop_id: "stop-1",
        storage_path: "x.jpg",
        uploaded_by: "user-1",
        uploaded_role: "superadmin",
        created_at: "2026-01-01T00:00:00.000Z",
      }),
    ).toThrow();
  });
});

describe("isPhotoLimitError", () => {
  it("reconoce el check_violation (23514) del trigger de tope de 3 fotos", () => {
    expect(isPhotoLimitError({ code: "23514" })).toBe(true);
  });

  it("no confunde otros códigos de error ni ausencia de error", () => {
    expect(isPhotoLimitError({ code: "23505" })).toBe(false);
    expect(isPhotoLimitError(null)).toBe(false);
    expect(isPhotoLimitError(undefined)).toBe(false);
  });
});
