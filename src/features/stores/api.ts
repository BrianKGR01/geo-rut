import { z } from "zod";
import type { NewStopInput } from "@/features/stops/stopsOps";
import { coordsSourceSchema, latSchema, lngSchema } from "@/lib/supabase/schemas";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";
import type { CoordsSource, LatLng } from "@/types/domain";

/** Tienda del catálogo reusable entre rutas (nombre + ubicación; el pedido vive en `route_stops`). */
export interface StoreRecord extends LatLng {
  id: string;
  name: string;
  coordsSource: CoordsSource;
  sourceUrl?: string;
  createdAt: string;
}

export const storeRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: latSchema,
  lng: lngSchema,
  coords_source: coordsSourceSchema,
  source_url: z.string().nullable(),
  created_at: z.string(),
});

export function mapStoreRow(row: z.infer<typeof storeRowSchema>): StoreRecord {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    coordsSource: row.coords_source,
    sourceUrl: row.source_url ?? undefined,
    createdAt: row.created_at,
  };
}

const STORE_COLUMNS = "id, name, lat, lng, coords_source, source_url, created_at";

export async function listActiveStores(supabase: SupabaseDb): Promise<StoreRecord[]> {
  const { data, error } = await supabase
    .from("stores")
    .select(STORE_COLUMNS)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return storeRowSchema.array().parse(data).map(mapStoreRow);
}

/** Reusa `NewStopInput` (mismo formulario/parser de links que ya arma una tienda en v1). */
export async function createStore(
  supabase: SupabaseDb,
  input: NewStopInput,
  createdBy: string,
): Promise<StoreRecord> {
  const insert: TablesInsert<"stores"> = {
    name: input.name.trim() || "Tienda sin nombre",
    lat: input.lat,
    lng: input.lng,
    coords_source: input.coordsSource,
    source_url: input.sourceUrl ?? null,
    created_by: createdBy,
  };
  const { data, error } = await supabase.from("stores").insert(insert).select(STORE_COLUMNS).single();
  if (error) throw error;
  return mapStoreRow(storeRowSchema.parse(data));
}

export interface UpdateStoreInput {
  name?: string;
  lat?: number;
  lng?: number;
  coordsSource?: CoordsSource;
}

/** Edita nombre y/o ubicación de una tienda ya existente del catálogo (pantalla `/admin/stores`). */
export async function updateStore(supabase: SupabaseDb, id: string, patch: UpdateStoreInput): Promise<StoreRecord> {
  const update: TablesUpdate<"stores"> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name.trim() || "Tienda sin nombre";
  if (patch.lat !== undefined) update.lat = patch.lat;
  if (patch.lng !== undefined) update.lng = patch.lng;
  if (patch.coordsSource !== undefined) update.coords_source = patch.coordsSource;

  const { data, error } = await supabase.from("stores").update(update).eq("id", id).select(STORE_COLUMNS).single();
  if (error) throw error;
  return mapStoreRow(storeRowSchema.parse(data));
}

/** Baja lógica: desaparece del catálogo para elegir en rutas nuevas, no de las ya armadas. */
export async function deactivateStore(supabase: SupabaseDb, id: string, deletedBy: string): Promise<void> {
  const update: TablesUpdate<"stores"> = { deleted_at: new Date().toISOString(), deleted_by: deletedBy };
  const { error } = await supabase.from("stores").update(update).eq("id", id);
  if (error) throw error;
}
