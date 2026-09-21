import { z } from "zod";
import { latSchema, lngSchema, stopStatusSchema } from "@/lib/supabase/schemas";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";
import type { StopStatus } from "@/types/domain";

/**
 * Una tienda dentro de una ruta concreta, con su pedido. Mapeo casi mecánico del `Stop` de
 * `src/types/domain.ts` (mismos `id/name/lat/lng/status/note/arrivedAt/deliveredAt/createdAt`),
 * salvo que acá no hay `coordsSource`/`sourceUrl` (eso vive en el catálogo `stores`, no en la
 * copia de `route_stops`) y se suma `pedidoMonto`, `storeId` y `routeId`. Las partidas del
 * pedido (`orderItems` en `Stop`) se manejan aparte, ver `routeStopItems.ts`.
 */
export interface RouteStop {
  id: string;
  routeId: string;
  storeId: string | null;
  name: string;
  lat: number;
  lng: number;
  position: number;
  status: StopStatus;
  note?: string;
  /** Bs, múltiplo de 5. `null` = todavía sin cargar (opcional). */
  pedidoMonto: number | null;
  arrivedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export const ROUTE_STOP_COLUMNS =
  "id, route_id, store_id, name, lat, lng, position, status, note, pedido_monto, arrived_at, delivered_at, created_at";

export const routeStopRowSchema = z.object({
  id: z.string(),
  route_id: z.string(),
  store_id: z.string().nullable(),
  name: z.string(),
  lat: latSchema,
  lng: lngSchema,
  position: z.number(),
  status: stopStatusSchema,
  note: z.string().nullable(),
  pedido_monto: z.number().nullable(),
  arrived_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
  created_at: z.string(),
});

export function mapRouteStopRow(row: z.infer<typeof routeStopRowSchema>): RouteStop {
  return {
    id: row.id,
    routeId: row.route_id,
    storeId: row.store_id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    position: row.position,
    status: row.status,
    note: row.note ?? undefined,
    pedidoMonto: row.pedido_monto,
    arrivedAt: row.arrived_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** Bs, positivo y múltiplo de 5 (mismo check de la base); reusable por el formulario del pedido. */
export const pedidoMontoInputSchema = z
  .number()
  .positive("El monto debe ser mayor a 0 Bs.")
  .multipleOf(5, "El monto debe ser múltiplo de 5 Bs.")
  .nullable();

export interface NewRouteStopInput {
  routeId: string;
  /** De qué tienda del catálogo viene, si vino de ahí (nunca desde una tienda nueva). */
  storeId?: string | null;
  name: string;
  lat: number;
  lng: number;
}

/** La tienda nueva va al final del orden de visita (mismo criterio que `addStop` en v1). */
export async function addRouteStop(supabase: SupabaseDb, input: NewRouteStopInput): Promise<RouteStop> {
  const { data: last, error: lastError } = await supabase
    .from("route_stops")
    .select("position")
    .eq("route_id", input.routeId)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;
  const position = (last?.position ?? -1) + 1;

  const insert: TablesInsert<"route_stops"> = {
    route_id: input.routeId,
    store_id: input.storeId ?? null,
    name: input.name.trim() || "Tienda sin nombre",
    lat: input.lat,
    lng: input.lng,
    position,
  };
  const { data, error } = await supabase.from("route_stops").insert(insert).select(ROUTE_STOP_COLUMNS).single();
  if (error) throw error;
  return mapRouteStopRow(routeStopRowSchema.parse(data));
}

export interface RouteStopPatch {
  name?: string;
  position?: number;
  /** `null` borra el monto cargado; `undefined` lo deja como está. */
  pedidoMonto?: number | null;
}

export async function updateRouteStop(supabase: SupabaseDb, id: string, patch: RouteStopPatch): Promise<RouteStop> {
  const update: TablesUpdate<"route_stops"> = {};
  if (patch.name !== undefined) update.name = patch.name.trim() || "Tienda sin nombre";
  if (patch.position !== undefined) update.position = patch.position;
  if (patch.pedidoMonto !== undefined) update.pedido_monto = pedidoMontoInputSchema.parse(patch.pedidoMonto);

  const { data, error } = await supabase
    .from("route_stops")
    .update(update)
    .eq("id", id)
    .select(ROUTE_STOP_COLUMNS)
    .single();
  if (error) throw error;
  return mapRouteStopRow(routeStopRowSchema.parse(data));
}

/** Quitar una tienda de la ruta es borrado lógico, igual que el resto de la app. */
export async function removeRouteStop(supabase: SupabaseDb, id: string, deletedBy: string): Promise<void> {
  const update: TablesUpdate<"route_stops"> = { deleted_at: new Date().toISOString(), deleted_by: deletedBy };
  const { error } = await supabase.from("route_stops").update(update).eq("id", id);
  if (error) throw error;
}

/**
 * Actualiza `position` de varias tiendas a la vez. No hay una función `rpc` para esto en el
 * esquema (solo `chofer_update_stop`), así que se resuelve con un `update` por fila en paralelo
 * (`Promise.all`); las rutas rara vez tienen más de unas pocas decenas de tiendas.
 */
export async function reorderRouteStops(supabase: SupabaseDb, routeId: string, orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("route_stops").update({ position: index }).eq("id", id).eq("route_id", routeId),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

/**
 * Estado liviano de una tienda para el sondeo del administrador (docs/PLAN_V2.md §6): sin `note`
 * ni fotos, para que la respuesta del `select` sea chica y se pueda pedir cada 10-15 s.
 */
export interface RouteStopLiveState {
  id: string;
  position: number;
  status: StopStatus;
  arrivedAt?: string;
  deliveredAt?: string;
}

const ROUTE_STOP_LIVE_COLUMNS = "id, position, status, arrived_at, delivered_at";

const routeStopLiveRowSchema = z.object({
  id: z.string(),
  position: z.number(),
  status: stopStatusSchema,
  arrived_at: z.string().nullable(),
  delivered_at: z.string().nullable(),
});

function mapRouteStopLiveRow(row: z.infer<typeof routeStopLiveRowSchema>): RouteStopLiveState {
  return {
    id: row.id,
    position: row.position,
    status: row.status,
    arrivedAt: row.arrived_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
  };
}

/** Un `select` por ronda de sondeo: solo las columnas que puede cambiar el chofer, nada de `note`/fotos. */
export async function fetchRouteStopLiveStates(supabase: SupabaseDb, routeId: string): Promise<RouteStopLiveState[]> {
  const { data, error } = await supabase
    .from("route_stops")
    .select(ROUTE_STOP_LIVE_COLUMNS)
    .eq("route_id", routeId)
    .is("deleted_at", null);
  if (error) throw error;
  return routeStopLiveRowSchema.array().parse(data).map(mapRouteStopLiveRow);
}

/**
 * Orden final tras "Optimizar ruta": entregadas y en curso conservan su lugar relativo actual
 * (nunca se reordenan solas), las pendientes van al final ya en el orden que calculó
 * `optimizePendingOrder` (mismo criterio que `applyOptimizedOrder` de v1, ver `docs/DECISIONS.md`).
 */
export function optimizedRouteOrder<T extends { id: string; status: StopStatus }>(
  stops: T[],
  optimizedPendingIds: string[],
): string[] {
  const idsWithStatus = (status: StopStatus) => stops.filter((stop) => stop.status === status).map((stop) => stop.id);
  return [...idsWithStatus("delivered"), ...idsWithStatus("delivering"), ...optimizedPendingIds];
}

/**
 * Aplica el resultado de un sondeo a la lista de tiendas ya cargada: solo pisa `status`/
 * `arrivedAt`/`deliveredAt` (lo que puede cambiar `chofer_update_stop`), conserva el resto de cada
 * tienda (pedido, orden en pantalla) tal cual estaba. Genérica sobre `T extends RouteStop` para
 * poder usarse directo con `RouteStopDetail` (que además trae `items`/`images`) sin duplicarla.
 */
export function mergeRouteStopLiveStates<T extends RouteStop>(stops: T[], liveStates: RouteStopLiveState[]): T[] {
  const liveById = new Map(liveStates.map((live) => [live.id, live]));
  return stops.map((stop) => {
    const live = liveById.get(stop.id);
    if (!live) return stop;
    if (live.status === stop.status && live.arrivedAt === stop.arrivedAt && live.deliveredAt === stop.deliveredAt) {
      return stop;
    }
    return { ...stop, status: live.status, arrivedAt: live.arrivedAt, deliveredAt: live.deliveredAt };
  });
}
