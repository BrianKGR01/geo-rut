import { z } from "zod";
import { formatDateTime } from "@/lib/format";
import { legsCacheSchema, orderModeSchema, routeStatusSchema, startPointSchema } from "@/lib/supabase/schemas";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";
import type { LegsCache, OrderMode, RouteStatus, StartPoint } from "@/types/domain";
import { generateDriverCode } from "./driverCode";
import {
  ROUTE_STOP_ITEM_COLUMNS,
  routeStopItemRowSchema,
  mapRouteStopItemRow,
  type RouteStopItem,
} from "./routeStopItems";
import {
  ROUTE_STOP_IMAGE_COLUMNS,
  routeStopImageRowSchema,
  mapRouteStopImageRow,
  type RouteStopImage,
} from "./routeStopImages";
import { ROUTE_STOP_COLUMNS, routeStopRowSchema, mapRouteStopRow, type RouteStop } from "./routeStops";

/**
 * Mapeo casi mecánico de `routes` a los campos que ya existen en `RoutePlan` (dominio v1):
 * `status`/`orderMode`(`order_mode`)/`startPoint`/`legsCache`/`startedAt`/`finishedAt` son los
 * mismos; se suman `id`, `driverId`, `driverCode` y la auditoría (`createdBy`/`createdAt`), que
 * no existían porque v1 tenía una sola ruta implícita. No incluye `stopOrder`/`currentTargetId`
 * de `RoutePlan`: el orden sale de `route_stops.position` y "hacia cuál voy" no se persiste.
 */
export interface RouteSummary {
  id: string;
  driverId: string | null;
  status: RouteStatus;
  orderMode: OrderMode;
  driverCode: string;
  startPoint?: StartPoint;
  legsCache?: LegsCache;
  createdBy: string | null;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface RouteStopDetail extends RouteStop {
  items: RouteStopItem[];
  images: RouteStopImage[];
}

export interface RouteWithStops extends RouteSummary {
  stops: RouteStopDetail[];
}

export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
  draft: "Borrador",
  active: "Activa",
  finished: "Finalizada",
};

/** Etiqueta de una fila en la lista de rutas: "chofer — fecha de alta" (o "Sin asignar — …"). */
export function formatRouteLabel(driverName: string | undefined, createdAt: string): string {
  return `${driverName ?? "Sin asignar"} — ${formatDateTime(createdAt)}`;
}

const ROUTE_COLUMNS =
  "id, driver_id, status, order_mode, driver_code, start_point, legs_cache, created_by, created_at, started_at, finished_at";

export const routeRowSchema = z.object({
  id: z.string(),
  driver_id: z.string().nullable(),
  status: routeStatusSchema,
  order_mode: orderModeSchema,
  driver_code: z.string(),
  // Un caché o punto de partida inválido no debe tumbar el resto de la ruta: se descarta (igual
  // que `legsCache` en `lib/storage/schema.ts`).
  start_point: startPointSchema.nullable().catch(null),
  legs_cache: legsCacheSchema.nullable().catch(null),
  created_by: z.string().nullable(),
  created_at: z.string(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
});

export function mapRouteRow(row: z.infer<typeof routeRowSchema>): RouteSummary {
  return {
    id: row.id,
    driverId: row.driver_id,
    status: row.status,
    orderMode: row.order_mode,
    driverCode: row.driver_code,
    startPoint: row.start_point ?? undefined,
    legsCache: row.legs_cache ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
  };
}

const routeStopWithDetailsRowSchema = routeStopRowSchema.extend({
  route_stop_items: routeStopItemRowSchema.array(),
  route_stop_images: routeStopImageRowSchema.array(),
});
type RouteStopWithDetailsRow = z.infer<typeof routeStopWithDetailsRowSchema>;

/** Pura: arma `RouteWithStops` a partir de filas ya validadas. Ordena tiendas, partidas y fotos. */
export function assembleRouteWithStops(route: RouteSummary, stopRows: RouteStopWithDetailsRow[]): RouteWithStops {
  const stops = stopRows
    .map((row): RouteStopDetail => ({
      ...mapRouteStopRow(row),
      items: row.route_stop_items.map(mapRouteStopItemRow).sort((a, b) => a.position - b.position),
      images: row.route_stop_images.map(mapRouteStopImageRow).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }))
    .sort((a, b) => a.position - b.position);
  return { ...route, stops };
}

export async function listRoutes(supabase: SupabaseDb): Promise<RouteSummary[]> {
  const { data, error } = await supabase
    .from("routes")
    .select(ROUTE_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return routeRowSchema.array().parse(data).map(mapRouteRow);
}

/**
 * Trae la ruta con sus `route_stops`, `route_stop_items` y `route_stop_images` en 2 consultas
 * (no N+1): una para la ruta y otra para sus tiendas con las partidas y fotos de cada una
 * incrustadas (`select` anidado de PostgREST, filtrando lo borrado en cada nivel). No filtra
 * `deleted_at` de la ruta en sí: una ruta cancelada sigue pudiéndose ver en detalle.
 */
export async function getRoute(supabase: SupabaseDb, id: string): Promise<RouteWithStops | null> {
  const { data: routeRow, error: routeError } = await supabase
    .from("routes")
    .select(ROUTE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (routeError) throw routeError;
  if (!routeRow) return null;
  const route = mapRouteRow(routeRowSchema.parse(routeRow));

  const { data: stopRows, error: stopsError } = await supabase
    .from("route_stops")
    .select(`${ROUTE_STOP_COLUMNS}, route_stop_items(${ROUTE_STOP_ITEM_COLUMNS}), route_stop_images(${ROUTE_STOP_IMAGE_COLUMNS})`)
    .eq("route_id", id)
    .is("deleted_at", null)
    .is("route_stop_items.deleted_at", null)
    .is("route_stop_images.deleted_at", null);
  if (stopsError) throw stopsError;

  return assembleRouteWithStops(route, routeStopWithDetailsRowSchema.array().parse(stopRows));
}

export interface NewRouteInput {
  driverId?: string | null;
}

const UNIQUE_VIOLATION_ERROR_CODE = "23505";
const MAX_DRIVER_CODE_ATTEMPTS = 5;

/** Genera un `driver_code` de 6 caracteres y reintenta si choca contra la restricción `unique`. */
export async function createRoute(supabase: SupabaseDb, input: NewRouteInput, createdBy: string): Promise<RouteSummary> {
  for (let attempt = 0; attempt < MAX_DRIVER_CODE_ATTEMPTS; attempt++) {
    const insert: TablesInsert<"routes"> = {
      driver_id: input.driverId ?? null,
      driver_code: generateDriverCode(),
      created_by: createdBy,
    };
    const { data, error } = await supabase.from("routes").insert(insert).select(ROUTE_COLUMNS).single();
    if (!error) return mapRouteRow(routeRowSchema.parse(data));
    if (error.code !== UNIQUE_VIOLATION_ERROR_CODE) throw error;
  }
  throw new Error("No se pudo generar un código de chofer único. Intenta de nuevo.");
}

async function updateRouteRow(supabase: SupabaseDb, id: string, update: TablesUpdate<"routes">): Promise<RouteSummary> {
  const { data, error } = await supabase.from("routes").update(update).eq("id", id).select(ROUTE_COLUMNS).single();
  if (error) throw error;
  return mapRouteRow(routeRowSchema.parse(data));
}

export async function activateRoute(supabase: SupabaseDb, id: string): Promise<RouteSummary> {
  return updateRouteRow(supabase, id, { status: "active", started_at: new Date().toISOString() });
}

export async function finishRoute(supabase: SupabaseDb, id: string): Promise<RouteSummary> {
  return updateRouteRow(supabase, id, { status: "finished", finished_at: new Date().toISOString() });
}

export async function assignDriver(supabase: SupabaseDb, id: string, driverId: string | null): Promise<RouteSummary> {
  return updateRouteRow(supabase, id, { driver_id: driverId });
}

/** Cancelar es borrado lógico: la ruta desaparece de `listRoutes` pero el historial queda. */
export async function cancelRoute(supabase: SupabaseDb, id: string, deletedBy: string): Promise<void> {
  const update: TablesUpdate<"routes"> = { deleted_at: new Date().toISOString(), deleted_by: deletedBy };
  const { error } = await supabase.from("routes").update(update).eq("id", id);
  if (error) throw error;
}
