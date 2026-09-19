"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/storage/store";
import { PlanScreen } from "./route/PlanScreen";
import { AddStopSheet } from "./stops/AddStopSheet";
import { StopDetailSheet } from "./stops/StopDetailSheet";
import { DEFAULT_CENTER } from "./map/defaultCenter";
import { useHasMounted } from "./ui/useHasMounted";

type OpenSheet = { kind: "add" } | { kind: "detail"; id: string } | null;

export function AppShell() {
  const mounted = useHasMounted();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const stops = useAppStore((state) => state.stops);
  const detailStop = sheet?.kind === "detail" ? stops.find((stop) => stop.id === sheet.id) : undefined;
  const lastStop = stops[stops.length - 1];

  return (
    <div className="app-shell flex flex-col">
      <header className="flex h-14 shrink-0 items-center border-b-2 border-ink px-4">
        <h1 className="text-xl font-extrabold tracking-tight">RutaTiendas</h1>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        {mounted ? (
          <PlanScreen
            onAddStop={() => setSheet({ kind: "add" })}
            onOpenStop={(id) => setSheet({ kind: "detail", id })}
          />
        ) : (
          <p className="m-auto text-ink-soft" role="status">
            Cargando…
          </p>
        )}
      </main>
      {sheet?.kind === "add" && (
        <AddStopSheet pickerCenter={lastStop ?? DEFAULT_CENTER} onClose={() => setSheet(null)} />
      )}
      {detailStop && (
        <StopDetailSheet key={detailStop.id} stop={detailStop} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
