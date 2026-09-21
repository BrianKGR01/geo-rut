/**
 * Límite de intentos fallidos por IP para `POST /api/routes/claim` (evitar fuerza bruta del
 * código de 6 caracteres). Mismo espíritu que la cola de Nominatim (`lib/geo/nominatim.ts`): un
 * `Map` en memoria alcanza para el tamaño de esta app (una instancia, sin persistencia entre
 * despliegues, lo que es aceptable para este propósito).
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

const failedAttemptsByIp = new Map<string, number[]>();

function recentAttempts(ip: string, now: number): number[] {
  const timestamps = failedAttemptsByIp.get(ip) ?? [];
  return timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
}

/** true si esa IP ya superó el límite de intentos fallidos en la ventana actual. */
export function isRateLimited(ip: string, now: number = Date.now()): boolean {
  return recentAttempts(ip, now).length >= MAX_FAILED_ATTEMPTS;
}

/** Registra un intento fallido (código inválido, ruta inactiva, sesión inválida, etc.). */
export function registerFailedAttempt(ip: string, now: number = Date.now()): void {
  const timestamps = recentAttempts(ip, now);
  timestamps.push(now);
  failedAttemptsByIp.set(ip, timestamps);
}

/** Solo para tests: limpia el estado en memoria entre casos. */
export function resetRateLimitState(): void {
  failedAttemptsByIp.clear();
}
