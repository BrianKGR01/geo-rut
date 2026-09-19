import { isAllowedMapsUrl, unwrapConsentUrl } from "@/lib/geo/allowedHosts";
import type { FetchLike } from "@/lib/geo/nominatim";
import {
  extractQueryText,
  extractSuggestedName,
  parseCoordsFromHtml,
  parseCoordsFromUrl,
  parseLatLngText,
  type ParsedCoords,
} from "@/lib/geo/parseMapsLink";
import type { LatLng } from "@/types/domain";
import type { ResolveLinkErrorCode, ResolveLinkResult } from "./resolveLinkContract";

export const MAX_REDIRECTS = 5;
export const TIMEOUT_MS = 8000;
export const MAX_BODY_BYTES = 1_500_000;
const BROWSER_UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";

export interface ResolveLinkDeps {
  fetch: FetchLike;
  geocode: (query: string) => Promise<LatLng | null>;
}

class ResolveError extends Error {
  constructor(readonly code: ResolveLinkErrorCode) {
    super(code);
  }
}

function toAllowedUrl(raw: string, base?: URL): URL {
  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    throw new ResolveError("INVALID_URL");
  }
  url = unwrapConsentUrl(url) ?? url;
  if (url.protocol === "http:") url.protocol = "https:";
  if (!isAllowedMapsUrl(url)) throw new ResolveError("HOST_NOT_ALLOWED");
  return url;
}

async function readBounded(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  while (bytes < MAX_BODY_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return text;
}

interface Landing {
  url: URL;
  coords: ParsedCoords | null;
  html: string;
}

/** Sigue redirecciones a mano para validar el host en CADA salto. */
async function followRedirects(start: URL, fetchImpl: FetchLike): Promise<Landing> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const coords = parseCoordsFromUrl(url.href);
    if (coords?.source === "link-exact") return { url, coords, html: "" };

    const response = await fetchImpl(url.href, {
      redirect: "manual",
      signal,
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "es" },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      await response.body?.cancel().catch(() => undefined);
      url = toAllowedUrl(location, url);
      continue;
    }
    return { url, coords, html: response.ok ? await readBounded(response) : "" };
  }
  throw new ResolveError("TOO_MANY_REDIRECTS");
}

function toErrorCode(error: unknown): ResolveLinkErrorCode {
  if (error instanceof ResolveError) return error.code;
  const name = error instanceof Error ? error.name : "";
  return name === "TimeoutError" || name === "AbortError" ? "TIMEOUT" : "FETCH_FAILED";
}

export async function resolveLink(input: string, deps: ResolveLinkDeps): Promise<ResolveLinkResult> {
  const plain = parseLatLngText(input);
  if (plain) return { lat: plain.lat, lng: plain.lng, source: plain.source, resolvedUrl: "" };

  let landing: Landing;
  try {
    landing = await followRedirects(toAllowedUrl(input.trim()), deps.fetch);
  } catch (error) {
    return { error: toErrorCode(error) };
  }

  const resolvedUrl = landing.url.href;
  const suggestedName = extractSuggestedName(resolvedUrl);
  const fromHtml = landing.html ? parseCoordsFromHtml(landing.html) : null;
  const exact = [landing.coords, fromHtml].find((coords) => coords?.source === "link-exact");
  const best = exact ?? landing.coords ?? fromHtml;
  if (best) {
    return { lat: best.lat, lng: best.lng, source: best.source, resolvedUrl, suggestedName };
  }

  const query = extractQueryText(resolvedUrl);
  const geocoded = query ? await deps.geocode(query).catch(() => null) : null;
  if (geocoded) return { ...geocoded, source: "geocoded", resolvedUrl, suggestedName };
  return { error: "NO_COORDS", suggestedName };
}
