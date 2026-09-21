import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Canjea el `token_hash` de un enlace de invitación/recuperación de contraseña por una sesión
 * real (cookies), y recién ahí redirige a la pantalla que corresponda. Patrón documentado por
 * Supabase para apps con sesión en cookies (`@supabase/ssr`): la verificación tiene que pasar por
 * el servidor de la app, no alcanza con el link que arma Supabase por su cuenta.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/admin/login";

  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirectTo.pathname = next;
      return NextResponse.redirect(redirectTo);
    }
  }

  // Enlace vencido, ya usado, o incompleto: la pantalla de destino explica qué hacer.
  redirectTo.pathname = "/admin/login";
  redirectTo.searchParams.set("enlace", "invalido");
  return NextResponse.redirect(redirectTo);
}
