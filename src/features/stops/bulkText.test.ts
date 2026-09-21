import { describe, expect, it } from "vitest";
import type { Stop } from "@/types/domain";
import { MAX_BULK_ITEMS, parseBulkText, serializeStops } from "./bulkText";

function makeStop(id: string, name: string, lat: number, lng: number): Stop {
  return {
    id,
    name,
    lat,
    lng,
    coordsSource: "manual",
    status: "pending",
    orderItems: [],
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("parseBulkText", () => {
  it("parsea varios bloques bien formados, con el link o las coordenadas en cualquier orden", () => {
    const text = [
      "Bodega Ana",
      "https://www.google.com/maps?q=-12.0464,-77.0428",
      "",
      "-12.05,-77.04",
      "Minimarket El Sol",
    ].join("\n");

    const result = parseBulkText(text);

    expect(result.errors).toEqual([]);
    expect(result.truncated).toBe(false);
    expect(result.blocks).toEqual([
      {
        line: 1,
        name: "Bodega Ana",
        locationText: "https://www.google.com/maps?q=-12.0464,-77.0428",
      },
      {
        line: 4,
        name: "Minimarket El Sol",
        locationText: "-12.05,-77.04",
        coords: { lat: -12.05, lng: -77.04, source: "link-exact" },
      },
    ]);
  });

  it("separa bloques aunque haya varias líneas en blanco seguidas entre ellos", () => {
    const text =
      "Bodega Ana\nhttps://www.google.com/maps?q=-12.0,-77.0\n\n\n\nMinimarket Sol\nhttps://www.google.com/maps?q=-12.1,-77.1";

    const result = parseBulkText(text);

    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0]?.name).toBe("Bodega Ana");
    expect(result.blocks[1]?.name).toBe("Minimarket Sol");
    expect(result.blocks[1]?.line).toBe(6);
  });

  it("acepta un bloque con solo la línea de ubicación, sin nombre", () => {
    const result = parseBulkText("https://www.google.com/maps?q=-12.0,-77.0");

    expect(result.blocks).toEqual([
      {
        line: 1,
        name: "",
        locationText: "https://www.google.com/maps?q=-12.0,-77.0",
      },
    ]);
  });

  it("reporta error solo en el bloque sin link ni coordenadas y sigue con el resto", () => {
    const text = [
      "Bodega sin ubicación",
      "Otra línea sin datos útiles",
      "",
      "Minimarket Sol",
      "https://www.google.com/maps?q=-12.1,-77.1",
    ].join("\n");

    const result = parseBulkText(text);

    expect(result.errors).toEqual([
      {
        line: 1,
        text: "Bodega sin ubicación\nOtra línea sin datos útiles",
        reason: "No encontré un link ni coordenadas.",
      },
    ]);
    expect(result.blocks).toEqual([
      {
        line: 4,
        name: "Minimarket Sol",
        locationText: "https://www.google.com/maps?q=-12.1,-77.1",
      },
    ]);
  });

  it("recorta a MAX_BULK_ITEMS grupos y marca truncated cuando hay más bloques", () => {
    const totalBlocks = MAX_BULK_ITEMS + 5;
    const text = Array.from(
      { length: totalBlocks },
      (_, index) => `https://www.google.com/maps?q=-1,-${index + 1}`,
    ).join("\n\n");

    const result = parseBulkText(text);

    expect(result.truncated).toBe(true);
    expect(result.blocks.length + result.errors.length).toBe(MAX_BULK_ITEMS);
    expect(result.errors).toEqual([]);
  });

  it("no marca truncated cuando hay exactamente MAX_BULK_ITEMS bloques", () => {
    const text = Array.from(
      { length: MAX_BULK_ITEMS },
      (_, index) => `https://www.google.com/maps?q=-1,-${index + 1}`,
    ).join("\n\n");

    const result = parseBulkText(text);

    expect(result.truncated).toBe(false);
    expect(result.blocks).toHaveLength(MAX_BULK_ITEMS);
  });
});

describe("serializeStops", () => {
  it("genera nombre + link ?q=lat,lng por tienda, separados por una línea en blanco", () => {
    const stops = [makeStop("a", "Bodega Ana", -12.0464, -77.0428), makeStop("b", "Minimarket El Sol", -12.05, -77.04)];

    const text = serializeStops(stops, ["a", "b"]);

    expect(text).toBe(
      "Bodega Ana\nhttps://www.google.com/maps?q=-12.0464,-77.0428\n\nMinimarket El Sol\nhttps://www.google.com/maps?q=-12.05,-77.04",
    );
  });

  it("ignora ids de order sin tienda y tiendas que no están en order", () => {
    const stops = [
      makeStop("a", "Bodega Ana", -12.0464, -77.0428),
      makeStop("c", "No debería salir", -1, -1),
    ];

    const text = serializeStops(stops, ["missing", "a"]);

    expect(text).toBe("Bodega Ana\nhttps://www.google.com/maps?q=-12.0464,-77.0428");
  });

  it("usa las coordenadas guardadas de la tienda, no el sourceUrl original", () => {
    const stop: Stop = {
      ...makeStop("a", "Bodega Ana", -12.0464, -77.0428),
      sourceUrl: "https://maps.app.goo.gl/AbC123xyz",
    };

    const text = serializeStops([stop], ["a"]);

    expect(text).toBe("Bodega Ana\nhttps://www.google.com/maps?q=-12.0464,-77.0428");
  });
});
