import { describe, expect, it, vi } from "vitest";
import { DUPLICATE_RADIUS_M, importBulkText, type ImportBulkTextDeps } from "./importStops";
import { resolveErrorMessage } from "./resolveLinkClient";
import type { ResolveLinkResult } from "./resolveLinkContract";

function deps(resolveLink: ImportBulkTextDeps["resolveLink"] = vi.fn()): ImportBulkTextDeps {
  return { resolveLink };
}

describe("importBulkText", () => {
  it("usa coordenadas en texto plano directo, sin llamar a resolveLink", async () => {
    const resolveLink = vi.fn();
    const result = await importBulkText("Bodega Ana\n-12.05, -77.04", [], deps(resolveLink));
    expect(result).toEqual({
      items: [
        {
          status: "ok",
          line: 1,
          name: "Bodega Ana",
          lat: -12.05,
          lng: -77.04,
          coordsSource: "link-exact",
          approximate: false,
        },
      ],
      truncated: false,
    });
    expect(resolveLink).not.toHaveBeenCalled();
  });

  it("resuelve en el cliente un link con ?q=lat,lng, sin llamar a resolveLink", async () => {
    const resolveLink = vi.fn();
    const url = "https://www.google.com/maps?q=-12.0464,-77.0428";
    const result = await importBulkText(`Bodega Ana\n${url}`, [], deps(resolveLink));
    expect(result.items).toEqual([
      {
        status: "ok",
        line: 1,
        name: "Bodega Ana",
        lat: -12.0464,
        lng: -77.0428,
        coordsSource: "link-exact",
        sourceUrl: url,
        approximate: false,
      },
    ]);
    expect(resolveLink).not.toHaveBeenCalled();
  });

  it("llama a resolveLink cuando el link no trae coordenadas en texto plano", async () => {
    const resolveLink = vi.fn(
      async (): Promise<ResolveLinkResult> => ({
        lat: -12.0464,
        lng: -77.0428,
        source: "link-exact",
        resolvedUrl: "https://www.google.com/maps/place/Bodega+Ana/@-12.0464,-77.0428,17z",
        suggestedName: "Bodega Ana",
      }),
    );
    const url = "https://maps.app.goo.gl/AbC";
    const result = await importBulkText(url, [], deps(resolveLink));
    expect(resolveLink).toHaveBeenCalledTimes(1);
    expect(resolveLink).toHaveBeenCalledWith(url);
    expect(result.items).toEqual([
      {
        status: "ok",
        line: 1,
        name: "Bodega Ana",
        lat: -12.0464,
        lng: -77.0428,
        coordsSource: "link-exact",
        sourceUrl: url,
        approximate: false,
      },
    ]);
  });

  it("reporta el error de resolveLink con el mensaje correcto (NO_COORDS)", async () => {
    const resolveLink = vi.fn(async (): Promise<ResolveLinkResult> => ({ error: "NO_COORDS" }));
    const url = "https://maps.app.goo.gl/sin-coords";
    const result = await importBulkText(url, [], deps(resolveLink));
    expect(result.items).toEqual([
      { status: "error", line: 1, text: url, reason: resolveErrorMessage("NO_COORDS") },
    ]);
  });

  it("marca duplicada una tienda contra `existing` y otra duplicada dentro del mismo lote", async () => {
    const resolveLink = vi.fn();
    const text = [
      "Bodega Existente\n-12.05000, -77.04000",
      "Bodega Nueva\n-12.20000, -77.20000",
      "Bodega Repetida\n-12.20000, -77.20000",
    ].join("\n\n");
    const existing = [{ lat: -12.05, lng: -77.04 }];
    const result = await importBulkText(text, existing, deps(resolveLink));
    expect(result.items).toEqual([
      { status: "duplicate", line: 1, name: "Bodega Existente", lat: -12.05, lng: -77.04 },
      {
        status: "ok",
        line: 4,
        name: "Bodega Nueva",
        lat: -12.2,
        lng: -77.2,
        coordsSource: "link-exact",
        approximate: false,
      },
      { status: "duplicate", line: 7, name: "Bodega Repetida", lat: -12.2, lng: -77.2 },
    ]);
  });

  it("no marca como duplicado un punto fuera del radio de detección", async () => {
    const resolveLink = vi.fn();
    const farLat = -12.05 + (DUPLICATE_RADIUS_M * 2) / 111_320; // ~2x el radio, en grados de latitud
    const text = `Bodega Lejos\n${farLat}, -77.04`;
    const existing = [{ lat: -12.05, lng: -77.04 }];
    const result = await importBulkText(text, existing, deps(resolveLink));
    expect(result.items).toEqual([
      {
        status: "ok",
        line: 1,
        name: "Bodega Lejos",
        lat: farLat,
        lng: -77.04,
        coordsSource: "link-exact",
        approximate: false,
      },
    ]);
  });

  it("respeta el número de línea al ordenar bloques resueltos y errores de parseo", async () => {
    const resolveLink = vi.fn(
      async (): Promise<ResolveLinkResult> => ({
        lat: -12.1,
        lng: -77.1,
        source: "link-exact",
        resolvedUrl: "https://www.google.com/maps?q=-12.1,-77.1",
      }),
    );
    const text = [
      "Bodega A\n-12.05, -77.04",
      "Solo texto sin ubicación reconocible",
      "Bodega B\nhttps://maps.app.goo.gl/xyz",
    ].join("\n\n");
    const result = await importBulkText(text, [], deps(resolveLink));
    expect(result.items.map((item) => item.line)).toEqual([1, 4, 6]);
    expect(result.items[0]).toMatchObject({ status: "ok", name: "Bodega A" });
    expect(result.items[1]).toMatchObject({ status: "error", line: 4 });
    expect(result.items[2]).toMatchObject({ status: "ok", name: "Bodega B" });
  });

  it("propaga `truncated` desde parseBulkText y llama a onProgress por cada bloque resuelto", async () => {
    const resolveLink = vi.fn();
    const blocks = Array.from({ length: 101 }, (_, i) => `Bodega ${i}\n${-12 - i * 0.001}, -77.04`);
    const onProgress = vi.fn();
    const result = await importBulkText(blocks.join("\n\n"), [], { resolveLink, onProgress });
    expect(result.truncated).toBe(true);
    expect(result.items).toHaveLength(100);
    expect(onProgress).toHaveBeenCalledTimes(100);
    expect(onProgress).toHaveBeenLastCalledWith(100, 100);
  });
});
