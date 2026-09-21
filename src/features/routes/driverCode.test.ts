import { describe, expect, it } from "vitest";
import { DRIVER_CODE_LENGTH, generateDriverCode } from "./driverCode";

const ALLOWED = new Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split(""));

describe("generateDriverCode", () => {
  it("genera códigos de 6 caracteres del alfabeto sin ambiguos", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateDriverCode();
      expect(code).toHaveLength(DRIVER_CODE_LENGTH);
      expect([...code].every((char) => ALLOWED.has(char))).toBe(true);
    }
  });

  it("nunca incluye 0/O ni 1/I", () => {
    const code = generateDriverCode();
    expect(code).not.toMatch(/[01OI]/);
  });

  it("es determinístico con un generador de aleatorios inyectado", () => {
    expect(generateDriverCode(() => 0)).toBe("AAAAAA");
    expect(generateDriverCode(() => 0.999999)).toBe("999999");
  });
});
