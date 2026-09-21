import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, registerFailedAttempt, resetRateLimitState } from "./claimRateLimit";

const T0 = Date.parse("2026-01-01T10:00:00.000Z");

beforeEach(() => {
  resetRateLimitState();
});

describe("isRateLimited", () => {
  it("no limita una IP sin intentos previos", () => {
    expect(isRateLimited("1.1.1.1", T0)).toBe(false);
  });

  it("limita tras 10 intentos fallidos dentro de la ventana", () => {
    for (let i = 0; i < 10; i++) registerFailedAttempt("2.2.2.2", T0 + i * 1000);
    expect(isRateLimited("2.2.2.2", T0 + 10_000)).toBe(true);
  });

  it("no limita con 9 intentos fallidos", () => {
    for (let i = 0; i < 9; i++) registerFailedAttempt("3.3.3.3", T0 + i * 1000);
    expect(isRateLimited("3.3.3.3", T0 + 9_000)).toBe(false);
  });

  it("los intentos fuera de la ventana de 10 minutos no cuentan", () => {
    for (let i = 0; i < 10; i++) registerFailedAttempt("4.4.4.4", T0 + i * 1000);
    const tenMinutesLater = T0 + 10 * 60 * 1000 + 1;
    expect(isRateLimited("4.4.4.4", tenMinutesLater)).toBe(false);
  });

  it("IPs distintas no se contagian el límite", () => {
    for (let i = 0; i < 10; i++) registerFailedAttempt("5.5.5.5", T0 + i * 1000);
    expect(isRateLimited("6.6.6.6", T0 + 10_000)).toBe(false);
  });
});
