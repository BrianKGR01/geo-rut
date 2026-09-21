import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

/**
 * Cliente de Supabase tipado con el esquema real, sin importar si viene del navegador
 * (`lib/supabase/client.ts`) o del servidor (`lib/supabase/server.ts`): las funciones de
 * `features/*\/api.ts` lo reciben como parámetro en vez de crearlo, así sirven para los dos.
 */
export type SupabaseDb = SupabaseClient<Database>;
