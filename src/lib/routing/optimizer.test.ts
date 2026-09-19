import { describe, expect, it } from "vitest";
import { haversineMeters } from "@/lib/geo/haversine";
import { EXACT_LIMIT, optimizeOpenPath, pathCost } from "./optimizer";

/** Generador determinista para que los tests no dependan del azar. */
function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function randomMatrix(size: number, seed: number, asymmetric = false): number[][] {
  const random = rng(seed);
  const points = Array.from({ length: size }, () => ({ lat: random() * 0.2, lng: random() * 0.2 }));
  return points.map((from) =>
    points.map((to) => haversineMeters(from, to) * (asymmetric ? 1 + random() * 0.5 : 1)),
  );
}

function bruteForce(matrix: number[][]): number {
  const nodes = matrix.map((_, index) => index).slice(1);
  let best = Infinity;
  const permute = (prefix: number[], rest: number[]) => {
    if (rest.length === 0) best = Math.min(best, pathCost(matrix, prefix));
    rest.forEach((node, index) =>
      permute([...prefix, node], [...rest.slice(0, index), ...rest.slice(index + 1)]),
    );
  };
  permute([], nodes);
  return best;
}

describe("optimizeOpenPath", () => {
  it("maneja 0 y 1 paradas", () => {
    expect(optimizeOpenPath([[0]])).toEqual([]);
    expect(optimizeOpenPath([[0, 5], [5, 0]])).toEqual([1]);
  });

  it("encuentra el óptimo conocido en una línea recta", () => {
    // Inicio en 0; paradas en las posiciones 30, 10 y 20 de una recta → visitar 10, 20, 30.
    const positions = [0, 30, 10, 20];
    const matrix = positions.map((a) => positions.map((b) => Math.abs(a - b)));
    expect(optimizeOpenPath(matrix)).toEqual([2, 3, 1]);
  });

  it("no regresa al inicio: es un camino abierto", () => {
    // Con regreso convendría otro orden; abierto conviene terminar lejos.
    const positions = [0, -1, 10];
    const matrix = positions.map((a) => positions.map((b) => Math.abs(a - b)));
    expect(optimizeOpenPath(matrix)).toEqual([1, 2]);
  });

  it.each([3, 5, 7])("coincide con fuerza bruta con %i paradas (simétrica y asimétrica)", (stops) => {
    for (const asymmetric of [false, true]) {
      const matrix = randomMatrix(stops + 1, stops * 17 + 1, asymmetric);
      const order = optimizeOpenPath(matrix);
      expect([...order].sort((a, b) => a - b)).toEqual(matrix.map((_, i) => i).slice(1));
      expect(pathCost(matrix, order)).toBeCloseTo(bruteForce(matrix), 6);
    }
  });

  it(`es exacto justo en el límite de ${EXACT_LIMIT} paradas sin tardar`, () => {
    const matrix = randomMatrix(EXACT_LIMIT + 1, 99);
    const started = performance.now();
    const order = optimizeOpenPath(matrix);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(order).toHaveLength(EXACT_LIMIT);
  });

  it.each([10, 25, 60])("con %i paradas nunca es peor que el orden de entrada", (stops) => {
    for (const seed of [1, 2, 3]) {
      const matrix = randomMatrix(stops + 1, seed * stops, true);
      const order = optimizeOpenPath(matrix);
      const input = matrix.map((_, i) => i).slice(1);
      expect([...order].sort((a, b) => a - b)).toEqual(input);
      expect(pathCost(matrix, order)).toBeLessThanOrEqual(pathCost(matrix, input));
    }
  });

  it("devuelve el orden de entrada si ya era el mejor", () => {
    const positions = Array.from({ length: 13 }, (_, index) => index * 10);
    const matrix = positions.map((a) => positions.map((b) => Math.abs(a - b)));
    expect(optimizeOpenPath(matrix)).toEqual(positions.map((_, i) => i).slice(1));
  });
});
