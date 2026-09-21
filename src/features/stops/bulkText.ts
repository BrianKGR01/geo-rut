import type { Stop } from "@/types/domain";
import { cleanText, parseLatLngText, type ParsedCoords } from "@/lib/geo/parseMapsLink";

/** Groups (bloques + errores) que se procesan por importación; el resto se recorta. */
export const MAX_BULK_ITEMS = 100;

export interface BulkBlock {
  line: number; // número de línea (1-based) donde empieza el bloque en el texto original
  name: string; // "" si el bloque no traía más que el link/coords
  locationText: string; // el link o "lat,lng" tal cual, sin resolver
  coords?: ParsedCoords; // si locationText ya era "lat, lng" en texto plano
}

export interface BulkParseError {
  line: number;
  text: string; // el bloque completo, para mostrárselo al usuario
  reason: string; // mensaje en español, accionable
}

export interface BulkParseResult {
  blocks: BulkBlock[];
  errors: BulkParseError[];
  truncated: boolean; // true si había más de MAX_BULK_ITEMS grupos y se recortó el resto sin procesarlo
}

const URL_START_RE = /^https?:\/\//i;

interface RawBlock {
  line: number;
  rawLines: string[];
}

/** Corta el texto en bloques separados por una o más líneas en blanco, con su línea de inicio. */
function splitBlocks(text: string): RawBlock[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: RawBlock[] = [];
  let current: string[] = [];
  let startLine = 0;
  lines.forEach((rawLine, index) => {
    if (rawLine.trim() === "") {
      if (current.length > 0) blocks.push({ line: startLine, rawLines: current });
      current = [];
      return;
    }
    if (current.length === 0) startLine = index + 1;
    current.push(rawLine);
  });
  if (current.length > 0) blocks.push({ line: startLine, rawLines: current });
  return blocks;
}

/** Dentro de un bloque, la línea de ubicación es la que parece un link o coordenadas planas. */
function findLocationIndex(lines: string[]): { index: number; coords?: ParsedCoords } | null {
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (URL_START_RE.test(line)) return { index };
    const coords = parseLatLngText(line);
    if (coords) return { index, coords };
  }
  return null;
}

function parseBlock(block: RawBlock): BulkBlock | BulkParseError {
  const trimmedLines = block.rawLines.map((line) => line.trim());
  const location = findLocationIndex(trimmedLines);
  if (!location) {
    return {
      line: block.line,
      text: block.rawLines.join("\n"),
      reason: "No encontré un link ni coordenadas.",
    };
  }
  const nameLines = trimmedLines.filter((_, index) => index !== location.index);
  return {
    line: block.line,
    name: cleanText(nameLines.join(" "), 80),
    locationText: trimmedLines[location.index],
    ...(location.coords ? { coords: location.coords } : {}),
  };
}

function isError(item: BulkBlock | BulkParseError): item is BulkParseError {
  return "reason" in item;
}

/** Parsea el formato de importación en lote: ver AGENTS.md / docs/PRD.md para el formato exacto. */
export function parseBulkText(text: string): BulkParseResult {
  const rawBlocks = splitBlocks(text);
  const truncated = rawBlocks.length > MAX_BULK_ITEMS;
  const blocks: BulkBlock[] = [];
  const errors: BulkParseError[] = [];
  for (const rawBlock of rawBlocks.slice(0, MAX_BULK_ITEMS)) {
    const parsed = parseBlock(rawBlock);
    if (isError(parsed)) errors.push(parsed);
    else blocks.push(parsed);
  }
  return { blocks, errors, truncated };
}

/** Genera el mismo formato de texto, en el orden de visita dado. */
export function serializeStops(stops: Stop[], order: string[]): string {
  const stopsById = new Map(stops.map((stop) => [stop.id, stop]));
  const chunks: string[] = [];
  for (const id of order) {
    const stop = stopsById.get(id);
    if (!stop) continue;
    chunks.push(`${stop.name}\nhttps://www.google.com/maps?q=${stop.lat},${stop.lng}`);
  }
  return chunks.join("\n\n");
}
