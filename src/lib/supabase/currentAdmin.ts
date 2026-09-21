import { redirect } from "next/navigation";
import type { SupabaseDb } from "./types";

/**
 * El layout de `/admin` (Server Component) ya exige una sesión de administrador activa antes de
 * renderizar cualquier página hija; esto solo repite el `user_id` para las páginas que lo
 * necesitan (auditoría de `created_by`/`deleted_by`). Redirige a login en el caso (ya cubierto
 * por el layout) de que no haya sesión válida, para no romper el tipo `string` con un `!`.
 */
export async function getCurrentUserId(supabase: SupabaseDb): Promise<string> {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/admin/login");
  return userId;
}
