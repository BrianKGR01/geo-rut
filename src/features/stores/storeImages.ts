import { z } from "zod";
import { newId } from "@/lib/storage/id";
import { isPhotoLimitError } from "@/lib/supabase/photoLimitError";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

export { isPhotoLimitError };

/** Tope de fotos activas por tienda del catálogo (mismo trigger que `route_stop_images`, Fase 1). */
export const STORE_IMAGES_LIMIT = 3;

/** Mensaje único (no técnico) para el tope de fotos; exportado para que la UI lo reconozca sin adivinar. */
export const STORE_PHOTO_LIMIT_MESSAGE = "Esta tienda ya tiene 3 fotos. Borra una para poder subir otra.";

const STORAGE_BUCKET = "tiendas";

/** Foto de referencia de una tienda del catálogo. Siempre la sube un administrador (sin `uploaded_role`: el chofer nunca toca `stores`). */
export interface StoreImage {
  id: string;
  storeId: string;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
}

export const STORE_IMAGE_COLUMNS = "id, store_id, storage_path, uploaded_by, created_at";

export const storeImageRowSchema = z.object({
  id: z.string(),
  store_id: z.string(),
  storage_path: z.string(),
  uploaded_by: z.string(),
  created_at: z.string(),
});

export function mapStoreImageRow(row: z.infer<typeof storeImageRowSchema>): StoreImage {
  return {
    id: row.id,
    storeId: row.store_id,
    storagePath: row.storage_path,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

export async function listStoreImages(supabase: SupabaseDb, storeId: string): Promise<StoreImage[]> {
  const { data, error } = await supabase
    .from("store_images")
    .select(STORE_IMAGE_COLUMNS)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return storeImageRowSchema.array().parse(data).map(mapStoreImageRow);
}

export interface NewStoreImageInput {
  storeId: string;
  /** Ruta dentro del bucket `tiendas` (`storeId/archivo`); la subida del archivo va aparte. */
  storagePath: string;
  uploadedBy: string;
}

/**
 * Registra la fila después de subir el archivo a Storage (esa subida la hace la pantalla que
 * llama a esto). El tope de 3 fotos activas por tienda ya lo aplica un trigger de la base
 * (`store_images_limit_trigger`, mismo patrón que `route_stop_images`); acá solo se traduce ese
 * rechazo a un mensaje legible.
 */
export async function insertStoreImage(supabase: SupabaseDb, input: NewStoreImageInput): Promise<StoreImage> {
  const insert: TablesInsert<"store_images"> = {
    store_id: input.storeId,
    storage_path: input.storagePath,
    uploaded_by: input.uploadedBy,
  };
  const { data, error } = await supabase.from("store_images").insert(insert).select(STORE_IMAGE_COLUMNS).single();
  if (error) {
    if (isPhotoLimitError(error)) throw new Error(STORE_PHOTO_LIMIT_MESSAGE);
    throw error;
  }
  return mapStoreImageRow(storeImageRowSchema.parse(data));
}

/** Borrado lógico; solo el administrador puede llamarlo (RLS ya lo exige, esto no lo repite). */
export async function removeStoreImage(supabase: SupabaseDb, id: string, deletedBy: string): Promise<void> {
  const update: TablesUpdate<"store_images"> = { deleted_at: new Date().toISOString(), deleted_by: deletedBy };
  const { error } = await supabase.from("store_images").update(update).eq("id", id);
  if (error) throw error;
}

/** Nombre único que conserva la extensión original (para que el navegador reconozca el tipo). */
function uniqueFileName(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const ext = dot > 0 ? originalName.slice(dot) : "";
  return `${newId()}${ext}`;
}

/** Ruta dentro del bucket `tiendas`: las políticas RLS de Storage solo exigen ese bucket + admin. */
export function buildStoreImagePath(storeId: string, fileName: string): string {
  return `${storeId}/${uniqueFileName(fileName)}`;
}

export interface UploadStoreImageInput {
  storeId: string;
  file: File;
  uploadedBy: string;
}

/**
 * Sube el archivo al bucket `tiendas` y registra la fila (en ese orden: la fila referencia una
 * ruta que ya existe). Si el `insert` falla (típicamente el tope de 3, `STORE_PHOTO_LIMIT_MESSAGE`),
 * borra el archivo recién subido para no dejar un objeto huérfano en Storage.
 */
export async function uploadStoreImage(supabase: SupabaseDb, input: UploadStoreImageInput): Promise<StoreImage> {
  const path = buildStoreImagePath(input.storeId, input.file.name);
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, input.file, { contentType: input.file.type || undefined });
  if (uploadError) throw new Error("No se pudo subir la foto. Intenta de nuevo.");

  try {
    return await insertStoreImage(supabase, { storeId: input.storeId, storagePath: path, uploadedBy: input.uploadedBy });
  } catch (error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    throw error;
  }
}

/** URLs firmadas para mostrar las fotos (bucket privado, sin acceso público); 10 minutos de validez. */
export async function getStoreImageUrls(supabase: SupabaseDb, paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrls(paths, 600);
  if (error) throw error;
  const urls: Record<string, string> = {};
  for (const entry of data) {
    if (entry.path && entry.signedUrl) urls[entry.path] = entry.signedUrl;
  }
  return urls;
}
