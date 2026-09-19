"use client";

import { useMemo, useState, type ReactNode } from "react";
import { StopListPanel } from "@/components/stops/StopListPanel";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { legByStopId } from "@/features/route/planRoute";
import { useOptimizeRoute } from "@/features/route/useOptimizeRoute";
import { useRouteView } from "@/features/route/useRouteView";
import { useAppStore } from "@/lib/storage/store";
import { GeoBanner } from "./GeoBanner";
import { PlanSummary } from "./PlanSummary";
import { RouteMapSection } from "./RouteMapSection";
import { StartPointRow } from "./StartPointRow";

interface PlanScreenProps {
  calculating: boolean;
  onAddStop: () => void;
  onOpenStop: (id: string) => void;
  onChangeStart: () => void;
  /** Acción primaria de la pantalla (p. ej. "Iniciar ruta"). */
  primaryAction?: ReactNode;
}

export function PlanScreen(props: PlanScreenProps) {
  const { calculating, onAddStop, onOpenStop, onChangeStart, primaryAction } = props;
  const view = useRouteView();
  const reorderStops = useAppStore((state) => state.reorderStops);
  const { optimize, optimizing, notice } = useOptimizeRoute();
  const [expanded, setExpanded] = useState(false);
  const legs = useMemo(() => legByStopId(view.route.legsCache), [view.route.legsCache]);
  const pendingCount = view.remaining.filter((stop) => stop.status === "pending").length;
  const isEmpty = view.stops.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RouteMapSection className={expanded ? "min-h-0 flex-1" : "h-[27%] shrink-0"} onMarkerClick={onOpenStop}>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-pressed={expanded}
          className="absolute right-3 top-3 z-10 flex min-h-12 items-center gap-2 rounded-xl border-2 border-strong bg-card px-3 font-bold shadow-md active:bg-raised"
        >
          <Icon name={expanded ? "list" : "expand"} size={20} />
          {expanded ? "Ver lista" : "Ampliar"}
        </button>
      </RouteMapSection>

      {!expanded && (
        <section
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-t-2 border-strong p-3"
          aria-label="Lista de tiendas"
        >
          {isEmpty ? (
            <>
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
                <p className="font-display text-3xl font-bold uppercase tracking-wide">Arma tu ruta</p>
                <p className="text-soft">
                  En Google Maps abre una tienda, toca <strong className="text-ink">Compartir → Copiar</strong> y
                  agrégala aquí. También puedes marcarla directo en el mapa.
                </p>
              </div>
              <GeoBanner />
            </>
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
              <div className="flex items-baseline justify-between px-1">
                <h2 className="font-display text-xl font-bold uppercase tracking-wide">Recorrido</h2>
                <p className="text-sm font-semibold text-soft">
                  {calculating ? "Calculando ruta…" : view.route.orderMode === "optimized" ? "Orden optimizado" : "Orden manual"}
                </p>
              </div>
              <StartPointRow onChange={onChangeStart} />
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

      <footer className="pb-safe flex shrink-0 flex-col gap-2 border-t-2 border-strong bg-card px-3 pt-3">
        {primaryAction}
        <div className="flex gap-2">
          <Button
            variant={isEmpty ? "primary" : "secondary"}
            big={isEmpty}
            icon="plus"
            className="flex-1"
            onClick={onAddStop}
          >
            Agregar tienda
          </Button>
          {pendingCount >= 2 && (
            <Button variant="secondary" icon="bolt" className="flex-1" onClick={optimize} disabled={optimizing}>
              {optimizing ? "Optimizando…" : "Optimizar"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
