import { describe, expect, it } from "vitest";
import { buildStoreImagePath, isPhotoLimitError, mapStoreImageRow, storeImageRowSchema } from "./storeImages";

describe("mapStoreImageRow", () => {
  it("mapea una fila de foto de tienda", () => {
    const row = storeImageRowSchema.parse({
      id: "img-1",
      store_id: "store-1",
      storage_path: "store-1/foto.jpg",
      uploaded_by: "admin-1",
      created_at: "2026-01-01T00:00:00.000Z",
    });

    expect(mapStoreImageRow(row)).toEqual({
      id: "img-1",
      storeId: "store-1",
      storagePath: "store-1/foto.jpg",
      uploadedBy: "admin-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("isPhotoLimitError (reexportado de lib/supabase/photoLimitError)", () => {
  it("reconoce el check_violation (23514) del trigger de tope de 3 fotos", () => {
    expect(isPhotoLimitError({ code: "23514" })).toBe(true);
  });

  it("no confunde otros códigos de error ni ausencia de error", () => {
    expect(isPhotoLimitError({ code: "23505" })).toBe(false);
    expect(isPhotoLimitError(null)).toBe(false);
    expect(isPhotoLimitError(undefined)).toBe(false);
  });
});

describe("buildStoreImagePath", () => {
  it("arma storeId/archivo y conserva la extensión original", () => {
    const path = buildStoreImagePath("store-1", "foto.JPG");
    expect(path).toMatch(/^store-1\/[^/]+\.JPG$/);
  });

  it("dos subidas seguidas generan nombres distintos (no se pisan)", () => {
    const a = buildStoreImagePath("store-1", "foto.png");
    const b = buildStoreImagePath("store-1", "foto.png");
    expect(a).not.toBe(b);
  });

  it("un archivo sin extensión no rompe el armado de la ruta", () => {
    const path = buildStoreImagePath("store-1", "foto-sin-extension");
    expect(path.startsWith("store-1/")).toBe(true);
    expect(path.endsWith(".")).toBe(false);
  });
});
