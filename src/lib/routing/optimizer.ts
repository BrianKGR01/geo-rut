/**
 * Optimización de camino ABIERTO: se parte del nodo 0 (fijo), se visitan todos los demás
 * y no se regresa. La matriz puede ser asimétrica (calles de un sentido).
 */

export const EXACT_LIMIT = 9;

const cost = (matrix: number[][], from: number, to: number) => matrix[from]?.[to] ?? Infinity;

export function pathCost(matrix: number[][], order: number[]): number {
  let total = 0;
  let previous = 0;
  for (const node of order) {
    total += cost(matrix, previous, node);
    previous = node;
  }
  return total;
}

/** Programación dinámica sobre subconjuntos (Held-Karp sin regreso). Exacto. */
function solveExact(matrix: number[][]): number[] {
  const n = matrix.length - 1;
  const full = (1 << n) - 1;
  const best = Array.from({ length: full + 1 }, () => new Array<number>(n).fill(Infinity));
  const parent = Array.from({ length: full + 1 }, () => new Array<number>(n).fill(-1));

  for (let j = 0; j < n; j++) best[1 << j][j] = cost(matrix, 0, j + 1);
  for (let mask = 1; mask <= full; mask++) {
    for (let last = 0; last < n; last++) {
      const current = best[mask][last];
      if (!(mask & (1 << last)) || current === Infinity) continue;
      for (let next = 0; next < n; next++) {
        if (mask & (1 << next)) continue;
        const candidate = current + cost(matrix, last + 1, next + 1);
        const nextMask = mask | (1 << next);
        if (candidate < best[nextMask][next]) {
          best[nextMask][next] = candidate;
          parent[nextMask][next] = last;
        }
      }
    }
  }

  let last = 0;
  for (let j = 1; j < n; j++) if (best[full][j] < best[full][last]) last = j;
  const order: number[] = [];
  for (let mask = full; last !== -1; ) {
    order.unshift(last + 1);
    const previous = parent[mask][last];
    mask &= ~(1 << last);
    last = previous;
  }
  return order;
}

function nearestNeighbor(matrix: number[][]): number[] {
  const pending = new Set(matrix.map((_, index) => index).slice(1));
  const order: number[] = [];
  let current = 0;
  while (pending.size > 0) {
    let bestNode = -1;
    for (const node of pending) {
      if (bestNode === -1 || cost(matrix, current, node) < cost(matrix, current, bestNode)) bestNode = node;
    }
    pending.delete(bestNode);
    order.push(bestNode);
    current = bestNode;
  }
  return order;
}

/** 2-opt (invertir un segmento) + reubicar una parada, hasta que nada mejore. */
function improve(matrix: number[][], initial: number[]): number[] {
  let order = initial;
  let bestCost = pathCost(matrix, order);
  const tryCandidate = (candidate: number[]) => {
    const candidateCost = pathCost(matrix, candidate);
    if (candidateCost + 1e-9 < bestCost) {
      order = candidate;
      bestCost = candidateCost;
      return true;
    }
    return false;
  };

  for (let improved = true, rounds = 0; improved && rounds < 50; rounds++) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const reversed = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        if (tryCandidate(reversed)) improved = true;
      }
    }
    for (let from = 0; from < order.length; from++) {
      for (let to = 0; to < order.length; to++) {
        if (from === to) continue;
        const moved = [...order];
        const [node] = moved.splice(from, 1);
        if (node === undefined) continue;
        moved.splice(to, 0, node);
        if (tryCandidate(moved)) improved = true;
      }
    }
  }
  return order;
}

/**
 * Devuelve el orden de visita de los nodos 1..n-1 partiendo del nodo 0.
 * Exacto hasta `EXACT_LIMIT` paradas; por encima, vecino más cercano + mejora local,
 * y nunca peor que el orden de entrada.
 */
export function optimizeOpenPath(matrix: number[][]): number[] {
  const stops = matrix.length - 1;
  if (stops <= 0) return [];
  if (stops === 1) return [1];
  if (stops <= EXACT_LIMIT) return solveExact(matrix);

  const inputOrder = matrix.map((_, index) => index).slice(1);
  const heuristic = improve(matrix, nearestNeighbor(matrix));
  return pathCost(matrix, heuristic) <= pathCost(matrix, inputOrder) ? heuristic : inputOrder;
}
