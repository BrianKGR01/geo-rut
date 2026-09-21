import { NextResponse } from "next/server";
import { claimRouteRequestSchema, type ClaimRouteErrorCode } from "@/features/route/claimContract";
import { isRateLimited, registerFailedAttempt } from "@/lib/http/claimRateLimit";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUS_BY_ERROR: Record<ClaimRouteErrorCode, number> = {
  INVALID_REQUEST: 400,
  TOO_MANY_ATTEMPTS: 429,
  UNAUTHORIZED: 401,
  ROUTE_NOT_FOUND: 404,
  ROUTE_NOT_ACTIVE: 409,
  CLAIM_FAILED: 500,
};

function fail(error: ClaimRouteErrorCode) {
  return NextResponse.json({ error }, { status: STATUS_BY_ERROR[error] });
}

/** IP del cliente, vía el encabezado que agrega Vercel (mismo criterio que `approx-location`). */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Canjea un código de 6 caracteres por acceso a una ruta activa. El cliente ya llamó a
 * `supabase.auth.signInAnonymously()` antes de pedir esto y manda su `access_token` en
 * `Authorization: Bearer <token>`; acá se verifica ese JWT contra Supabase (con la clave secreta,
 * `auth.getUser(token)`) y recién ahí se registra la sesión en `route_driver_sessions`.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const supabase = createAdminClient();
  if (await isRateLimited(supabase, ip)) return fail("TOO_MANY_ATTEMPTS");

  const body = await request.json().catch(() => null);
  const parsed = claimRouteRequestSchema.safeParse(body);
  if (!parsed.success) return fail("INVALID_REQUEST");

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) {
    await registerFailedAttempt(supabase, ip);
    return fail("UNAUTHORIZED");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    await registerFailedAttempt(supabase, ip);
    return fail("UNAUTHORIZED");
  }

  const code = parsed.data.code.toUpperCase();
  const { data: routeRow, error: routeError } = await supabase
    .from("routes")
    .select("id, status")
    .eq("driver_code", code)
    .is("deleted_at", null)
    .maybeSingle();
  if (routeError) return fail("CLAIM_FAILED");
  if (!routeRow) {
    await registerFailedAttempt(supabase, ip);
    return fail("ROUTE_NOT_FOUND");
  }
  if (routeRow.status !== "active") {
    await registerFailedAttempt(supabase, ip);
    return fail("ROUTE_NOT_ACTIVE");
  }

  const { error: sessionError } = await supabase
    .from("route_driver_sessions")
    .upsert({ route_id: routeRow.id, driver_user_id: userData.user.id }, { onConflict: "route_id,driver_user_id" });
  if (sessionError) return fail("CLAIM_FAILED");

  return NextResponse.json({ routeId: routeRow.id }, { status: 200 });
}
