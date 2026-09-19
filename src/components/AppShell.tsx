"use client";

import { useAppStore } from "@/lib/storage/store";
import { useHasMounted } from "./ui/useHasMounted";

export function AppShell() {
  const mounted = useHasMounted();
  const stopCount = useAppStore((state) => state.stops.length);

  return (
    <div className="app-shell flex flex-col">
      <header className="flex h-14 shrink-0 items-center border-b-2 border-ink px-4">
        <h1 className="text-xl font-extrabold tracking-tight">RutaTiendas</h1>
      </header>
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-safe text-center">
        {mounted ? (
          <p className="text-lg text-ink-soft">
            {stopCount === 0 ? "Aún no hay tiendas en tu ruta." : `${stopCount} tiendas cargadas.`}
          </p>
        ) : (
          <p className="text-ink-soft">Cargando…</p>
        )}
      </main>
    </div>
  );
}
