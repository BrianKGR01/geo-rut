"use client";

import { useState } from "react";
import { ChoferExecutionScreen } from "@/components/chofer/ChoferExecutionScreen";
import { ClaimCodeScreen } from "@/components/chofer/ClaimCodeScreen";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useApplyTheme } from "@/components/ui/useApplyTheme";
import { useHasMounted } from "@/components/ui/useHasMounted";
import { useGeolocationLifecycle } from "@/features/route/useGeolocationLifecycle";
import { clearClaimedRouteId, getClaimedRouteId } from "@/features/route/supabaseSession";

/**
 * Pantalla del chofer (`/`): sin cuenta propia, entra con el código de 6 caracteres que le da el
 * administrador (`docs/PLAN_V2.md` §3.2). Reemplaza a `AppShell` (v1, local/`localStorage`) como
 * raíz de la app; `settings` (tema) sigue en el store Zustand local, ver `useApplyTheme`.
 */
export function ChoferShell() {
  const mounted = useHasMounted();
  // Inicializador perezoso (no un efecto): en el servidor `getClaimedRouteId` devuelve `null`
  // (sin `window`) y en el cliente lee `localStorage` ya en el primer render; no genera un
  // desajuste de hidratación porque `mounted` (arriba) oculta todo lo que depende de `routeId`
  // hasta después de montar.
  const [routeId, setRouteId] = useState<string | null>(getClaimedRouteId);
  useGeolocationLifecycle();
  useApplyTheme();

  const forgetRoute = () => {
    clearClaimedRouteId();
    setRouteId(null);
  };

  return (
    <div className="app-shell flex flex-col">
      <header className="pt-safe shrink-0 bg-chrome text-on-chrome">
        <div className="flex h-14 items-center justify-between pl-4 pr-1">
          <h1 className="font-display text-[26px] font-bold uppercase leading-none tracking-wide">
            Ruta<span className="text-signal">Tiendas</span>
          </h1>
          {mounted && <ThemeToggle />}
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        {!mounted && (
          <p className="m-auto text-soft" role="status">
            Cargando…
          </p>
        )}
        {mounted && (routeId ? <ChoferExecutionScreen routeId={routeId} onLostAccess={forgetRoute} /> : <ClaimCodeScreen onClaimed={setRouteId} />)}
      </main>
    </div>
  );
}
