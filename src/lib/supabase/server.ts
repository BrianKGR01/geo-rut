import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Cliente de Supabase para Server Components y Route Handlers: es la sesión del ADMINISTRADOR
 * (permanente, con email/contraseña). `cookies()` es async desde Next 15+; se crea un cliente
 * nuevo por request, como pide la documentación de `@supabase/ssr`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Un Server Component no puede escribir cookies; el proxy (src/proxy.ts) ya
            // refresca la sesión en cada request, así que esto se puede ignorar sin riesgo.
          }
        },
      },
    },
  );
}
