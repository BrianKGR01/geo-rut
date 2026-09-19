"use client";

import { useMemo, useState } from "react";
import { RouteMap } from "@/components/map";
import { StopListPanel } from "@/components/stops/StopListPanel";
import { Button } from "@/components/ui/Button";
import { buildMarkers } from "@/features/route/markers";
import { useRouteView } from "@/features/route/useRouteView";

interface PlanScreenProps {
  onAddStop: () => void;
  onOpenStop: (id: string) => void;
}

export function PlanScreen({ onAddStop, onOpenStop }: PlanScreenProps) {
  const view = useRouteView();
  const [expanded, setExpanded] = useState(false);
  const markers = useMemo(() => buildMarkers(view, view.next?.id), [view]);
  const isEmpty = view.stops.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className={`relative shrink-0 ${expanded ? "min-h-0 flex-1" : "h-[40%]"}`} aria-label="Mapa de la ruta">
        <RouteMap
          markers={markers}
          path={[]}
          approximate={false}
          fitKey={view.route.stopOrder.join("|")}
          onMarkerClick={onOpenStop}
        />
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="absolute right-3 top-3 z-10 min-h-12 rounded-xl border-2 border-ink bg-paper px-3 font-bold shadow-md"
        >
          {expanded ? "Ver lista" : "Ampliar mapa"}
        </button>
      </section>

      {!expanded && (
        <section className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Lista de tiendas">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-xl font-extrabold">Aún no hay tiendas</p>
              <p className="text-ink-soft">
                Comparte una tienda desde Google Maps, copia el link y agrégala aquí.
              </p>
            </div>
          ) : (
            <StopListPanel
              delivered={view.delivered}
              remaining={view.remaining}
              nextId={view.next?.id}
              onOpenStop={onOpenStop}
            />
          )}
        </section>
      )}

      <footer className="pb-safe flex shrink-0 flex-col gap-2 border-t-2 border-line px-3 pt-3">
        <Button big variant={isEmpty ? "primary" : "secondary"} onClick={onAddStop}>
          Agregar tienda
        </Button>
      </footer>
    </div>
  );
}
