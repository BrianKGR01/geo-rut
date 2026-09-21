import { haversineMeters } from "@/lib/geo/haversine";
import { extractSuggestedName, parseCoordsFromUrl } from "@/lib/geo/parseMapsLink";
import type { CoordsSource, LatLng } from "@/types/domain";
import { parseBulkText, type BulkBlock } from "./bulkText";
import { resolveErrorMessage } from "./resolveLinkClient";
import { isResolveLinkError, type ResolveLinkResult } from "./resolveLinkContract";

/** Radio para considerar dos puntos "la misma tienda" al importar en lote (ver RF-9). */
export const DUPLICATE_RADIUS_M = 10;

export type BulkPreviewItem =
  | {
      status: "ok";
      line: number;
      name: string;
      lat: number;
      lng: number;
      coordsSource: CoordsSource;
      sourceUrl?: string;
      approximate: boolean;
    }
  | { status: "duplicate"; line: number; name: string; lat: number; lng: number }
  | { status: "error"; line: number; text: string; reason: string };

export interface ImportBulkTextResult {
  items: BulkPreviewItem[]; // en el orden del texto original (línea ascendente)
  truncated: boolean;
}

export interface ImportBulkTextDeps {
  resolveLink: (url: string) => Promise<ResolveLinkResult>;
  onProgress?: (done: number, total: number) => void; // se llama tras resolver cada bloque (done incluye los que no necesitaron red)
}

interface ResolvedLocation {
  name: string;
  lat: number;
  lng: number;
  coordsSource: CoordsSource;
  sourceUrl?: string;
  approximate: boolean;
}

interface ResolveFailure {
  reason: string;
}

/** El texto que se le muestra al usuario cuando falla la resolución de un bloque ya parseado. */
function blockDisplayText(block: BulkBlock): string {
  return [block.name, block.locationText].filter(Boolean).join("\n");
}

async function resolveBlock(
  block: BulkBlock,
  resolveLink: ImportBulkTextDeps["resolveLink"],
): Promise<ResolvedLocation | ResolveFailure> {
  if (block.coords) {
    return {
      name: block.name,
      lat: block.coords.lat,
      lng: block.coords.lng,
      coordsSource: "link-exact",
      approximate: false,
    };
  }

  const local = parseCoordsFromUrl(block.locationText);
  if (local) {
    return {
      name: block.name || extractSuggestedName(block.locationText) || "",
      lat: local.lat,
      lng: local.lng,
      coordsSource: local.source,
      sourceUrl: block.locationText,
      approximate: local.source === "link-approx",
    };
  }

  const result = await resolveLink(block.locationText);
  if (isResolveLinkError(result)) {
    return { reason: resolveErrorMessage(result.error) };
  }
  return {
    name: block.name || result.suggestedName || "",
    lat: result.lat,
    lng: result.lng,
    coordsSource: result.source,
    sourceUrl: block.locationText,
    approximate: result.source === "link-approx" || result.source === "geocoded",
  };
}

function isNearAny(point: LatLng, points: LatLng[]): boolean {
  return points.some((other) => haversineMeters(point, other) <= DUPLICATE_RADIUS_M);
}

/**
 * Resuelve un texto de importación en lote a una lista de tiendas propuestas.
 * Los bloques se resuelven UNO POR UNO, en orden (nunca en paralelo), para no saturar
 * Nominatim/Google con ráfagas de pedidos.
 */
export async function importBulkText(
  text: string,
  existing: LatLng[],
  deps: ImportBulkTextDeps,
): Promise<ImportBulkTextResult> {
  const { blocks, errors, truncated } = parseBulkText(text);
  const total = blocks.length;

  const items: BulkPreviewItem[] = errors.map((error) => ({
    status: "error",
    line: error.line,
    text: error.text,
    reason: error.reason,
  }));

  const accepted: LatLng[] = [];
  let done = 0;
  for (const block of blocks) {
    const resolved = await resolveBlock(block, deps.resolveLink);
    done += 1;
    deps.onProgress?.(done, total);

    if ("reason" in resolved) {
      items.push({ status: "error", line: block.line, text: blockDisplayText(block), reason: resolved.reason });
      continue;
    }

    const point = { lat: resolved.lat, lng: resolved.lng };
    if (isNearAny(point, existing) || isNearAny(point, accepted)) {
      items.push({ status: "duplicate", line: block.line, name: resolved.name, lat: resolved.lat, lng: resolved.lng });
      continue;
    }

    accepted.push(point);
    items.push({
      status: "ok",
      line: block.line,
      name: resolved.name,
      lat: resolved.lat,
      lng: resolved.lng,
      coordsSource: resolved.coordsSource,
      ...(resolved.sourceUrl ? { sourceUrl: resolved.sourceUrl } : {}),
      approximate: resolved.approximate,
    });
  }

  items.sort((a, b) => a.line - b.line);
  return { items, truncated };
}
