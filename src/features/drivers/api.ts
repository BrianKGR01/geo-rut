import { z } from "zod";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

/** Perfil básico de chofer (sin cuenta/login propio: entra por el código de 6 caracteres de una ruta). */
export interface Driver {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface NewDriverInput {
  name: string;
  phone?: string;
}

export interface DriverPatch {
  name?: string;
  /** `null` borra el teléfono guardado; `undefined` lo deja como está. */
  phone?: string | null;
}

export const driverRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  created_at: z.string(),
});

export function mapDriverRow(row: z.infer<typeof driverRowSchema>): Driver {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    createdAt: row.created_at,
  };
}

const DRIVER_COLUMNS = "id, name, phone, created_at";

export async function listActiveDrivers(supabase: SupabaseDb): Promise<Driver[]> {
  const { data, error } = await supabase
    .from("drivers")
    .select(DRIVER_COLUMNS)
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return driverRowSchema.array().parse(data).map(mapDriverRow);
}

export async function createDriver(supabase: SupabaseDb, input: NewDriverInput, createdBy: string): Promise<Driver> {
  const insert: TablesInsert<"drivers"> = {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    created_by: createdBy,
  };
  const { data, error } = await supabase.from("drivers").insert(insert).select(DRIVER_COLUMNS).single();
  if (error) throw error;
  return mapDriverRow(driverRowSchema.parse(data));
}

export async function updateDriver(supabase: SupabaseDb, id: string, patch: DriverPatch): Promise<Driver> {
  const update: TablesUpdate<"drivers"> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.phone !== undefined) update.phone = patch.phone?.trim() || null;

  const { data, error } = await supabase.from("drivers").update(update).eq("id", id).select(DRIVER_COLUMNS).single();
  if (error) throw error;
  return mapDriverRow(driverRowSchema.parse(data));
}

/** Baja lógica: nunca se borra la fila, solo se marca `deleted_at`/`deleted_by`. */
export async function deactivateDriver(supabase: SupabaseDb, id: string, deletedBy: string): Promise<void> {
  const update: TablesUpdate<"drivers"> = { deleted_at: new Date().toISOString(), deleted_by: deletedBy };
  const { error } = await supabase.from("drivers").update(update).eq("id", id);
  if (error) throw error;
}
