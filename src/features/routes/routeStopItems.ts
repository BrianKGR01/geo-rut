import { z } from "zod";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

/**
 * Una partida del pedido ("producto"): descripción + cantidad opcional, sin unidad fija.
 * Independiente de `RouteStop.pedidoMonto` (no se valida que sumen igual). No reusa `OrderItem`
 * de `src/types/domain.ts` porque ahí `quantity` es obligatorio y acá puede quedar sin cargar.
 */
export interface RouteStopItem {
  id: string;
  routeStopId: string;
  description: string;
  quantity: number | null;
  position: number;
  createdAt: string;
}

export const ROUTE_STOP_ITEM_COLUMNS = "id, route_stop_id, description, quantity, position, created_at";

export const routeStopItemRowSchema = z.object({
  id: z.string(),
  route_stop_id: z.string(),
  description: z.string(),
  quantity: z.number().nullable(),
  position: z.number(),
  created_at: z.string(),
});

export function mapRouteStopItemRow(row: z.infer<typeof routeStopItemRowSchema>): RouteStopItem {
  return {
    id: row.id,
    routeStopId: row.route_stop_id,
    description: row.description,
    quantity: row.quantity,
    position: row.position,
    createdAt: row.created_at,
  };
}

export interface NewRouteStopItemInput {
  routeStopId: string;
  description: string;
  quantity?: number | null;
}

/** La partida nueva va al final de la lista de ese pedido. */
export async function createRouteStopItem(supabase: SupabaseDb, input: NewRouteStopItemInput): Promise<RouteStopItem> {
  const { data: last, error: lastError } = await supabase
    .from("route_stop_items")
    .select("position")
    .eq("route_stop_id", input.routeStopId)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;
  const position = (last?.position ?? -1) + 1;

  const insert: TablesInsert<"route_stop_items"> = {
    route_stop_id: input.routeStopId,
    description: input.description.trim(),
    quantity: input.quantity ?? null,
    position,
  };
  const { data, error } = await supabase
    .from("route_stop_items")
    .insert(insert)
    .select(ROUTE_STOP_ITEM_COLUMNS)
    .single();
  if (error) throw error;
  return mapRouteStopItemRow(routeStopItemRowSchema.parse(data));
}

export interface RouteStopItemPatch {
  description?: string;
  quantity?: number | null;
  position?: number;
}

export async function updateRouteStopItem(
  supabase: SupabaseDb,
  id: string,
  patch: RouteStopItemPatch,
): Promise<RouteStopItem> {
  const update: TablesUpdate<"route_stop_items"> = {};
  if (patch.description !== undefined) update.description = patch.description.trim();
  if (patch.quantity !== undefined) update.quantity = patch.quantity;
  if (patch.position !== undefined) update.position = patch.position;

  const { data, error } = await supabase
    .from("route_stop_items")
    .update(update)
    .eq("id", id)
    .select(ROUTE_STOP_ITEM_COLUMNS)
    .single();
  if (error) throw error;
  return mapRouteStopItemRow(routeStopItemRowSchema.parse(data));
}

export async function removeRouteStopItem(supabase: SupabaseDb, id: string, deletedBy: string): Promise<void> {
  const update: TablesUpdate<"route_stop_items"> = { deleted_at: new Date().toISOString(), deleted_by: deletedBy };
  const { error } = await supabase.from("route_stop_items").update(update).eq("id", id);
  if (error) throw error;
}
