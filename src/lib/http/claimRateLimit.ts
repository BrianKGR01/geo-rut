import type { SupabaseDb } from "@/lib/supabase/types";

/**
 * Límite de intentos fallidos por IP para `POST /api/routes/claim` (evitar fuerza bruta del
 * código de 6 caracteres). Contador compartido en `claim_rate_limit_attempts` (no un `Map` en
 * memoria: en Vercel cada invocación serverless puede arrancar con su propio proceso, así que un
 * contador local no frena a quien reparte sus intentos entre varias instancias). RLS sin
 * políticas: solo el cliente de la clave secreta la toca (ver `docs/DECISIONS.md`, corrección
 * post-revisión de v2).
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

/** Recorte de la ventana de 10 minutos, expuesto para poder testearlo sin una base real. */
export function windowStart(now: number): string {
  return new Date(now - WINDOW_MS).toISOString();
}

/** true si esa IP ya superó el límite de intentos fallidos en la ventana actual. */
export async function isRateLimited(supabase: SupabaseDb, ip: string, now: number = Date.now()): Promise<boolean> {
  const { count, error } = await supabase
    .from("claim_rate_limit_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("attempted_at", windowStart(now));
  if (error) throw error;
  return (count ?? 0) >= MAX_FAILED_ATTEMPTS;
}

/**
 * Registra un intento fallido (código inválido, ruta inactiva, sesión inválida, etc.) y de paso
 * limpia los intentos viejos de esa misma IP (mismo criterio que antes tenía el `Map`: no hace
 * falta guardar más que la ventana vigente).
 */
export async function registerFailedAttempt(supabase: SupabaseDb, ip: string, now: number = Date.now()): Promise<void> {
  await supabase.from("claim_rate_limit_attempts").delete().eq("ip", ip).lt("attempted_at", windowStart(now));
  const { error } = await supabase
    .from("claim_rate_limit_attempts")
    .insert({ ip, attempted_at: new Date(now).toISOString() });
  if (error) throw error;
}
