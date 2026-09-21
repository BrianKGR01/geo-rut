import { z } from "zod";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { TablesUpdate } from "@/types/supabase";

/** Administrador: cuenta real de Supabase Auth (nunca la sesión anónima del chofer). */
export interface Admin {
  userId: string;
  displayName?: string;
  invitedBy: string | null;
  createdAt: string;
}

export const adminRowSchema = z.object({
  user_id: z.string(),
  display_name: z.string().nullable(),
  invited_by: z.string().nullable(),
  created_at: z.string(),
});

export function mapAdminRow(row: z.infer<typeof adminRowSchema>): Admin {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? undefined,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
  };
}

const ADMIN_COLUMNS = "user_id, display_name, invited_by, created_at";

export async function listActiveAdmins(supabase: SupabaseDb): Promise<Admin[]> {
  const { data, error } = await supabase
    .from("admins")
    .select(ADMIN_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return adminRowSchema.array().parse(data).map(mapAdminRow);
}

/** Baja lógica: nunca se borra la fila (queda para auditar más adelante quién invitó/quitó a quién). */
export async function deactivateAdmin(supabase: SupabaseDb, userId: string, deletedBy: string): Promise<void> {
  const update: TablesUpdate<"admins"> = { deleted_at: new Date().toISOString(), deleted_by: deletedBy };
  const { error } = await supabase.from("admins").update(update).eq("user_id", userId);
  if (error) throw error;
}

/** Solo bloquea quitarse a uno mismo cuando no queda otro admin activo (para no quedarse afuera). */
export function canDeactivateAdmin(targetUserId: string, currentUserId: string, activeAdminCount: number): boolean {
  return targetUserId !== currentUserId || activeAdminCount > 1;
}

/**
 * Email de cada admin vía la API admin de Auth (la tabla `admins` no lo guarda). Server-only: se
 * llama con el cliente de `lib/supabase/admin.ts` (clave secreta), nunca desde 'use client'. Un
 * `user_id` que ya no exista en Auth (caso raro) queda simplemente sin email en el mapa.
 */
export async function getAdminEmails(adminClient: SupabaseDb, userIds: string[]): Promise<Map<string, string>> {
  const entries = await Promise.all(
    userIds.map(async (userId): Promise<[string, string | undefined]> => {
      const { data } = await adminClient.auth.admin.getUserById(userId);
      return [userId, data.user?.email];
    }),
  );
  return new Map(entries.filter((entry): entry is [string, string] => Boolean(entry[1])));
}
