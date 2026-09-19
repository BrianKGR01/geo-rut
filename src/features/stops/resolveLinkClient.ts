import {
  resolveLinkErrorSchema,
  resolveLinkSuccessSchema,
  type ResolveLinkErrorCode,
  type ResolveLinkResult,
} from "./resolveLinkContract";

const CLIENT_TIMEOUT_MS = 15_000;

export async function requestResolveLink(url: string): Promise<ResolveLinkResult> {
  try {
    const response = await fetch("/api/resolve-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    const body: unknown = await response.json();
    const success = resolveLinkSuccessSchema.safeParse(body);
    if (response.ok && success.success) return success.data;
    const failure = resolveLinkErrorSchema.safeParse(body);
    return failure.success ? failure.data : { error: "FETCH_FAILED" };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return { error: timedOut ? "TIMEOUT" : "FETCH_FAILED" };
  }
}

const MESSAGES: Record<ResolveLinkErrorCode, string> = {
  INVALID_REQUEST: "No pude leer el link. Pégalo de nuevo o elige la ubicación en el mapa.",
  INVALID_URL: "Eso no parece un link. Pégalo de nuevo o elige la ubicación en el mapa.",
  HOST_NOT_ALLOWED: "Solo acepto links de Google Maps. Elige la ubicación en el mapa.",
  TOO_MANY_REDIRECTS: "No pude abrir el link. Elige la ubicación en el mapa.",
  TIMEOUT: "El link tardó demasiado. Reintenta o elige la ubicación en el mapa.",
  FETCH_FAILED: "No hay conexión para leer el link. Reintenta o elige la ubicación en el mapa.",
  NO_COORDS: "El link no trae la ubicación. Elígela en el mapa.",
};

export function resolveErrorMessage(code: ResolveLinkErrorCode): string {
  return MESSAGES[code];
}
