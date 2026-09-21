import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { createClient } from "@/lib/supabase/server";

/**
 * Shell de las pantallas de administrador: exige sesión real (no anónima) y fila activa en
 * `admins`. El proxy (src/proxy.ts) ya redirige sin sesión; acá se repite por si esta capa se
 * renderiza igual (Server Component) y, sobre todo, para el chequeo contra `admins` que el
 * proxy no hace (evita una consulta a la base en cada request de /admin/*).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims || claims.is_anonymous) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", claims.sub)
    .is("deleted_at", null)
    .maybeSingle();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="app-shell flex flex-col">
      <header className="pt-safe shrink-0 bg-chrome text-on-chrome">
        <div className="flex h-14 items-center justify-between gap-2 pl-4 pr-2">
          <h1 className="truncate font-display text-[26px] font-bold uppercase leading-none tracking-wide">
            Ruta<span className="text-signal">Tiendas</span>
            <span className="ml-2 text-sm font-semibold normal-case tracking-normal text-soft">Admin</span>
          </h1>
          <LogoutButton />
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
