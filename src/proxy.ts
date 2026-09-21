import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

// Next 16 renombró "middleware" a "proxy" (mismo archivo/función, solo cambió el nombre:
// docs/app/api-reference/file-conventions/proxy). Solo corre sobre /admin: el resto del sitio
// (la app del chofer) sigue público y no necesita tocar Supabase en cada request.
export const config = {
  matcher: ["/admin/:path*"],
};

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // No meter código entre createServerClient y getClaims(): getClaims() valida el JWT (a
  // diferencia de getSession()) y es el punto donde se refresca el token si venció.
  const { data } = await supabase.auth.getClaims();

  const isLoginPage = request.nextUrl.pathname.startsWith("/admin/login");
  if (!data?.claims && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return response;
}
