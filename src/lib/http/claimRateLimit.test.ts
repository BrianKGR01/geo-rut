import { describe, expect, it } from "vitest";
import { windowStart } from "./claimRateLimit";

// `isRateLimited`/`registerFailedAttempt` son ahora consultas directas a Supabase (contador
// compartido entre instancias, ver el comentario en claimRateLimit.ts); no se mockea el
// round-trip de red, siguiendo el mismo criterio que el resto de `features/routes/*.test.ts`.
// Lo único con lógica pura para testear es el recorte de la ventana de 10 minutos.
describe("windowStart", () => {
  it("recorta a 10 minutos antes de la fecha dada", () => {
    const now = Date.parse("2026-01-01T10:00:00.000Z");
    expect(windowStart(now)).toBe("2026-01-01T09:50:00.000Z");
  });
});
