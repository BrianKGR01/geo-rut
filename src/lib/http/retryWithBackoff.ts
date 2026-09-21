export interface RetryOptions {
  /** Espera (ms) antes de cada reintento; su longitud es el número de reintentos. */
  delaysMs?: number[];
  /** Inyectable para tests (evita esperas reales); por defecto `setTimeout`. */
  wait?: (ms: number) => Promise<void>;
}

const DEFAULT_DELAYS_MS = [800, 2000, 5000];

/**
 * Reintenta `task` unas pocas veces con espera corta creciente entre intentos (pensado para
 * absorber un corte de red breve durante la ejecución de una ruta, no para reemplazar una cola de
 * verdad — ver `features/route/pendingStopWrites.ts` para lo que sigue fallando después de esto).
 * Relanza el último error si se agotan los intentos.
 */
export async function retryWithBackoff<T>(task: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const delays = options.delaysMs ?? DEFAULT_DELAYS_MS;
  const wait = options.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < delays.length) await wait(delays[attempt]);
    }
  }
  throw lastError;
}
