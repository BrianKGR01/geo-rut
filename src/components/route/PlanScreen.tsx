"use client";

import { useMemo, useState, type ReactNode } from "react";
import { StopListPanel } from "@/components/stops/StopListPanel";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { legByStopId } from "@/features/route/planRoute";
import { useOptimizeRoute } from "@/features/route/useOptimizeRoute";
import { useRouteView } from "@/features/route/useRouteView";
import { useAppStore } from "@/lib/storage/store";
import { GeoBanner } from "./GeoBanner";
import { PlanSummary } from "./PlanSummary";
import { RouteMapSection } from "./RouteMapSection";

interface PlanScreenProps {
  calculating: boolean;
  onAddStop: () => void;
  onOpenStop: (id: string) => void;
  /** Acción primaria de la pantalla (p. ej. "Iniciar ruta"). */
  primaryAction?: ReactNode;
}

export function PlanScreen({ calculating, onAddStop, onOpenStop, primaryAction }: PlanScreenProps) {
  const view = useRouteView();
  const reorderStops = useAppStore((state) => state.reorderStops);
  const { optimize, optimizing, notice } = useOptimizeRoute();
  const [expanded, setExpanded] = useState(false);
  const legs = useMemo(() => legByStopId(view.route.legsCache), [view.route.legsCache]);
  const pendingCount = view.remaining.filter((stop) => stop.status === "pending").length;
  const isEmpty = view.stops.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RouteMapSection
        className={expanded ? "min-h-0 flex-1" : "h-[32%] shrink-0"}
        onMarkerClick={onOpenStop}
      >
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-pressed={expanded}
          className="absolute right-3 top-3 z-10 min-h-12 rounded-xl border-2 border-ink bg-paper px-3 font-bold shadow-md"
        >
          {expanded ? "Ver lista" : "Ampliar mapa"}
        </button>
      </RouteMapSection>

      {!expanded && (
        <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3" aria-label="Lista de tiendas">
          {isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
              <p className="text-xl font-extrabold">Aún no hay tiendas</p>
              <p className="text-ink-soft">
                Comparte una tienda desde Google Maps, copia el link y agrégala aquí.
              </p>
            </div>
          ) : (
            <>
              <PlanSummary
                pendingCount={pendingCount}
                orderMode={view.route.orderMode}
                cache={view.route.legsCache}
                calculating={calculating}
              />
              <GeoBanner />
              {notice && <Banner tone="warn">{notice}</Banner>}
              <StopListPanel
                delivered={view.delivered}
                remaining={view.remaining}
                nextId={view.next?.id}
                legs={legs}
                onOpenStop={onOpenStop}
                onReorder={reorderStops}
              />
            </>
          )}
        </section>
      )}

      <footer className="pb-safe flex shrink-0 flex-col gap-2 border-t-2 border-line px-3 pt-3">
        {primaryAction}
        <div className="flex gap-2">
          <Button
            variant={isEmpty ? "primary" : "secondary"}
            big={isEmpty}
            className="flex-1"
            onClick={onAddStop}
          >
            Agregar tienda
          </Button>
          {pendingCount >= 2 && (
            <Button variant="secondary" className="flex-1" onClick={optimize} disabled={optimizing}>
              {optimizing ? "Optimizando…" : "Optimizar ruta"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
