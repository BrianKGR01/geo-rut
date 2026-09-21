import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

/**
 * Cliente de Supabase para código que corre en el navegador ('use client'). La sesión se guarda
 * en cookies (no localStorage) para que el servidor pueda leerla también; `@supabase/ssr` maneja
 * la cookie sin configuración extra.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
