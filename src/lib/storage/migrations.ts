import type { AppData } from "@/types/domain";
import { appDataSchema, emptyAppData, SCHEMA_VERSION } from "./schema";

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** v0 (prototipo): las paradas no tenían `orderItems` ni la ruta `orderMode`. */
const migrateV0toV1: Migration = (state) => {
  const stops = Array.isArray(state.stops) ? state.stops : [];
  const route = isRecord(state.route) ? state.route : {};
  return {
    ...state,
    stops: stops.map((stop) =>
      isRecord(stop) ? { orderItems: [], ...stop } : stop,
    ),
    route: { orderMode: "manual", ...route },
  };
};

const MIGRATIONS: Record<number, Migration> = {
  0: migrateV0toV1,
};

/** Garantiza que `stopOrder` y `currentTargetId` sean coherentes con las paradas. */
export function repairConsistency(data: AppData): AppData {
  const ids = new Set(data.stops.map((stop) => stop.id));
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of data.route.stopOrder) {
    if (ids.has(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  for (const stop of data.stops) {
    if (!seen.has(stop.id)) order.push(stop.id);
  }
  const target = data.route.currentTargetId;
  return {
    stops: data.stops,
    route: {
      ...data.route,
      stopOrder: order,
      currentTargetId: target && ids.has(target) ? target : undefined,
    },
  };
}

export type MigrationResult =
  | { ok: true; data: AppData }
  | { ok: false; data: AppData };

/**
 * Lleva un estado persistido de cualquier versión anterior a la actual y lo valida.
 * Si no se puede recuperar devuelve un estado vacío con `ok: false`.
 */
export function migratePersisted(
  persisted: unknown,
  fromVersion: number,
): MigrationResult {
  if (!isRecord(persisted) || fromVersion > SCHEMA_VERSION) {
    return { ok: false, data: emptyAppData() };
  }
  let state = persisted;
  for (let version = Math.max(0, fromVersion); version < SCHEMA_VERSION; version++) {
    const migration = MIGRATIONS[version];
    if (migration) state = migration(state);
  }
  const parsed = appDataSchema.safeParse(state);
  if (!parsed.success) return { ok: false, data: emptyAppData() };
  return { ok: true, data: repairConsistency(parsed.data) };
}
