const ANY_PATH_HOSTS = new Set(["maps.app.goo.gl", "maps.google.com"]);
const MAPS_PATH_HOSTS = new Set(["goo.gl", "google.com"]);
// www.google.com, www.google.es, www.google.com.pe, www.google.co.uk…
const WWW_GOOGLE_RE = /^www\.google\.(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/;

/**
 * Lista blanca anti-SSRF del PRD (RF-2). Solo https, sin puerto ni credenciales,
 * y `google.com` / `www.google.*` / `goo.gl` únicamente bajo `/maps`.
 */
export function isAllowedMapsUrl(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (url.port !== "" || url.username !== "" || url.password !== "") return false;
  const host = url.hostname.toLowerCase();
  if (ANY_PATH_HOSTS.has(host)) return true;
  const underMaps = url.pathname === "/maps" || url.pathname.startsWith("/maps/");
  if (MAPS_PATH_HOSTS.has(host) || WWW_GOOGLE_RE.test(host)) return underMaps;
  return false;
}

/** La pantalla de consentimiento de Google lleva el destino real en `continue`; no se descarga. */
export function unwrapConsentUrl(url: URL): URL | null {
  if (url.hostname.toLowerCase() !== "consent.google.com") return null;
  const target = url.searchParams.get("continue");
  if (!target) return null;
  try {
    return new URL(target);
  } catch {
    return null;
  }
}
