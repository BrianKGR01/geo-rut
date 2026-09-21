import { z } from "zod";
import { newId } from "@/lib/storage/id";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

export type UploadedRole = "admin" | "chofer";

/** Tope de fotos activas por tienda (ya reforzado por un trigger en la base, ver `isPhotoLimitError`). */
export const ROUTE_STOP_IMAGES_LIMIT = 3;

/** Rótulo para mostrar quién subió cada foto, sin resolver el `uploaded_by` (compartido admin/chofer). */
export const UPLOADED_BY_LABEL: Record<UploadedRole, string> = {
  admin: "Subida por el administrador",
  chofer: "Subida por el chofer",
};

const STORAGE_BUCKET = "pedidos";

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

/** Mensaje único (no técnico) para el tope de fotos; exportado para que la UI lo reconozca sin adivinar. */
export const PHOTO_LIMIT_MESSAGE = "Esta tienda ya tiene 3 fotos. Borra una para poder subir otra.";

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
    if (isPhotoLimitError(error)) throw new Error(PHOTO_LIMIT_MESSAGE);
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

/** Nombre único que conserva la extensión original (para que el navegador reconozca el tipo). */
function uniqueFileName(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const ext = dot > 0 ? originalName.slice(dot) : "";
  return `${newId()}${ext}`;
}

/** Ruta dentro del bucket `pedidos`: las políticas RLS de Storage leen `routeId` del primer tramo. */
export function buildRouteStopImagePath(routeId: string, routeStopId: string, fileName: string): string {
  return `${routeId}/${routeStopId}/${uniqueFileName(fileName)}`;
}

export interface UploadRouteStopImageInput {
  routeId: string;
  routeStopId: string;
  file: File;
  uploadedBy: string;
  uploadedRole: UploadedRole;
}

/**
 * Sube el archivo al bucket `pedidos` y registra la fila (en ese orden: la fila referencia una
 * ruta que ya existe). Si el `insert` falla (típicamente el tope de 3, `PHOTO_LIMIT_MESSAGE`),
 * borra el archivo recién subido para no dejar un objeto huérfano en Storage.
 */
export async function uploadRouteStopImage(
  supabase: SupabaseDb,
  input: UploadRouteStopImageInput,
): Promise<RouteStopImage> {
  const path = buildRouteStopImagePath(input.routeId, input.routeStopId, input.file.name);
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, input.file, { contentType: input.file.type || undefined });
  if (uploadError) throw new Error("No se pudo subir la foto. Intenta de nuevo.");

  try {
    return await insertRouteStopImage(supabase, {
      routeStopId: input.routeStopId,
      storagePath: path,
      uploadedBy: input.uploadedBy,
      uploadedRole: input.uploadedRole,
    });
  } catch (error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    throw error;
  }
}

/** URLs firmadas para mostrar las fotos (bucket privado, sin acceso público); 10 minutos de validez. */
export async function getRouteStopImageUrls(supabase: SupabaseDb, paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrls(paths, 600);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const entry of data) {
    if (entry.path && entry.signedUrl) urls[entry.path] = entry.signedUrl;
  }
  return urls;
}
