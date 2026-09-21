import { CLAIM_ROUTE_ERROR_MESSAGE, claimRouteErrorSchema, claimRouteSuccessSchema } from "./claimContract";
import type { SupabaseDb } from "@/lib/supabase/types";

const CLAIMED_ROUTE_KEY = "rutatiendas-chofer-route-id";

/** `localStorage` puede estar bloqueado (modo privado estricto); nunca debe romper la app. */
function safeStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    // ver arriba
  }
  return undefined;
}

/** Ruta ya canjeada en este navegador, si la hay (mientras la sesión anónima siga viva). */
export function getClaimedRouteId(): string | null {
  return safeStorage()?.getItem(CLAIMED_ROUTE_KEY) ?? null;
}

function setClaimedRouteId(routeId: string): void {
  safeStorage()?.setItem(CLAIMED_ROUTE_KEY, routeId);
}

/** Olvida la ruta canjeada (código inválido, ruta ya no accesible, o el chofer pide cambiar de código). */
export function clearClaimedRouteId(): void {
  safeStorage()?.removeItem(CLAIMED_ROUTE_KEY);
}

/**
 * Crea la sesión anónima si todavía no existe; `supabase-js` la persiste sola entre recargas.
 * Requiere "Anonymous Sign-Ins" habilitado en el proyecto de Supabase (Authentication → Sign In /
 * Providers): si está apagado, `signInAnonymously` devuelve `anonymous_provider_disabled` — un
 * ajuste del panel, no algo que el chofer pueda arreglar, por eso el mensaje apunta al administrador.
 */
async function ensureAnonymousSession(supabase: SupabaseDb): Promise<string> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return existing.session.access_token;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) {
    if (error?.code === "anonymous_provider_disabled") {
      throw new Error("No se pudo iniciar tu sesión: avisa al administrador para que lo revise (inicio de sesión anónimo desactivado).");
    }
    throw new Error("No se pudo iniciar tu sesión. Revisa tu conexión e intenta de nuevo.");
  }
  return data.session.access_token;
}

export type ClaimRouteOutcome = { ok: true; routeId: string } | { ok: false; message: string };

/**
 * Canjea un código de 6 caracteres: asegura la sesión anónima, llama a `/api/routes/claim` con el
 * `access_token` en `Authorization`, y guarda el `routeId` canjeado en `localStorage` si sale bien.
 */
export async function claimRouteByCode(supabase: SupabaseDb, code: string): Promise<ClaimRouteOutcome> {
  let accessToken: string;
  try {
    accessToken = await ensureAnonymousSession(supabase);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo iniciar la sesión." };
  }

  let response: Response;
  try {
    response = await fetch("/api/routes/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ code }),
    });
  } catch {
    return { ok: false, message: "No se pudo canjear el código. Revisa tu conexión e intenta de nuevo." };
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsedError = claimRouteErrorSchema.safeParse(body);
    const message = parsedError.success
      ? CLAIM_ROUTE_ERROR_MESSAGE[parsedError.data.error]
      : CLAIM_ROUTE_ERROR_MESSAGE.CLAIM_FAILED;
    return { ok: false, message };
  }

  const parsed = claimRouteSuccessSchema.safeParse(body);
  if (!parsed.success) return { ok: false, message: CLAIM_ROUTE_ERROR_MESSAGE.CLAIM_FAILED };
  setClaimedRouteId(parsed.data.routeId);
  return { ok: true, routeId: parsed.data.routeId };
}
