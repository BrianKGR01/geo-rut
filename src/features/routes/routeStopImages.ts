import { z } from "zod";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

export type UploadedRole = "admin" | "chofer";

/** Foto del pedido, con quién la subió (importante: el chofer solo inserta, nunca borra). */
export interface RouteStopImage {
  id: string;
  routeStopId: string;
  storagePath: string;
  uploadedBy: string;
  uploadedRole: UploadedRole;
  createdAt: string;
}

export const ROUTE_STOP_IMAGE_COLUMNS = "id, route_stop_id, storage_path, uploaded_by, uploaded_role, created_at";

export const routeStopImageRowSchema = z.object({
  id: z.string(),
  route_stop_id: z.string(),
  storage_path: z.string(),
  uploaded_by: z.string(),
  uploaded_role: z.enum(["admin", "chofer"]),
  created_at: z.string(),
});

export function mapRouteStopImageRow(row: z.infer<typeof routeStopImageRowSchema>): RouteStopImage {
  return {
    id: row.id,
    routeStopId: row.route_stop_id,
    storagePath: row.storage_path,
    uploadedBy: row.uploaded_by,
    uploadedRole: row.uploaded_role,
    createdAt: row.created_at,
  };
}

export async function listRouteStopImages(supabase: SupabaseDb, routeStopId: string): Promise<RouteStopImage[]> {
  const { data, error } = await supabase
    .from("route_stop_images")
    .select(ROUTE_STOP_IMAGE_COLUMNS)
    .eq("route_stop_id", routeStopId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return routeStopImageRowSchema.array().parse(data).map(mapRouteStopImageRow);
}

export interface NewRouteStopImageInput {
  routeStopId: string;
  /** Ruta dentro del bucket `pedidos` (`routeId/routeStopId/archivo`); la subida del archivo va aparte. */
  storagePath: string;
  uploadedBy: string;
  uploadedRole: UploadedRole;
}

/** `23514` = `check_violation`: el trigger de la base ya corta la 4ta foto, acá solo se detecta. */
const PHOTO_LIMIT_ERROR_CODE = "23514";

export function isPhotoLimitError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === PHOTO_LIMIT_ERROR_CODE;
}

/**
 * Registra la fila después de subir el archivo a Storage (esa subida la hace la pantalla que
 * llama a esto). El tope de 3 fotos activas por tienda ya lo aplica un trigger de la base
 * (`enforce_route_stop_images_limit`); acá solo se traduce ese rechazo a un mensaje legible.
 */
export async function insertRouteStopImage(
  supabase: SupabaseDb,
  input: NewRouteStopImageInput,
): Promise<RouteStopImage> {
  const insert: TablesInsert<"route_stop_images"> = {
    route_stop_id: input.routeStopId,
    storage_path: input.storagePath,
    uploaded_by: input.uploadedBy,
    uploaded_role: input.uploadedRole,
  };
  const { data, error } = await supabase
    .from("route_stop_images")
    .insert(insert)
    .select(ROUTE_STOP_IMAGE_COLUMNS)
    .single();
  if (error) {
    if (isPhotoLimitError(error)) throw new Error("Esta tienda ya tiene 3 fotos. Borra una para poder subir otra.");
    throw error;
  }
  return mapRouteStopImageRow(routeStopImageRowSchema.parse(data));
}

/** Solo el administrador puede borrar (borrado lógico); RLS ya lo exige, esto no lo repite. */
export async function removeRouteStopImage(supabase: SupabaseDb, id: string, deletedBy: string): Promise<void> {
  const update: TablesUpdate<"route_stop_images"> = { deleted_at: new Date().toISOString(), deleted_by: deletedBy };
  const { error } = await supabase.from("route_stop_images").update(update).eq("id", id);
  if (error) throw error;
}
