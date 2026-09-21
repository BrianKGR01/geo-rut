import { describe, expect, it } from "vitest";
import { retryWithBackoff } from "./retryWithBackoff";

const noWait = async () => undefined;

describe("retryWithBackoff", () => {
  it("devuelve el resultado sin reintentar si el primer intento funciona", async () => {
    let calls = 0;
    const result = await retryWithBackoff(async () => {
      calls += 1;
      return "ok";
    }, { wait: noWait });
    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  it("reintenta hasta que funciona, dentro del número de reintentos configurado", async () => {
    let calls = 0;
    const result = await retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("todavía no");
        return "ok";
      },
      { delaysMs: [1, 1, 1], wait: noWait },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("relanza el último error si se agotan los reintentos", async () => {
    let calls = 0;
    await expect(
      retryWithBackoff(
        async () => {
          calls += 1;
          throw new Error(`falla ${calls}`);
        },
        { delaysMs: [1, 1], wait: noWait },
      ),
    ).rejects.toThrow("falla 3");
    expect(calls).toBe(3);
  });

  it("espera entre reintentos usando la función inyectada", async () => {
    const waits: number[] = [];
    let calls = 0;
    await retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 2) throw new Error("todavía no");
        return "ok";
      },
      {
        delaysMs: [800, 2000],
        wait: async (ms) => {
          waits.push(ms);
        },
      },
    );
    expect(waits).toEqual([800]);
  });
});
