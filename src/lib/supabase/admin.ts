import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { SupabaseDb } from "./types";

/**
 * Cliente de Supabase con la clave secreta (rol `service_role`): puentea RLS a propósito para lo
 * que solo el servidor puede hacer (API admin de Auth: invitar por email, leer el email de un
 * `user_id` — la tabla `admins` no lo guarda). Nunca se importa desde un componente 'use client',
 * solo desde Server Components/Route Handlers (ver docs/PLAN_V2.md §7).
 */
export function createAdminClient(): SupabaseDb {
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
