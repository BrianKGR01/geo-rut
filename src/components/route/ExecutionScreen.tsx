"use client";

import { useMemo } from "react";
import { useArrivalDetection } from "@/features/delivery/useArrivalDetection";
import { legByStopId } from "@/features/route/planRoute";
import { useRouteView } from "@/features/route/useRouteView";
import { formatDistance, formatDuration } from "@/lib/format";
import { DeliveryCard } from "./DeliveryCard";
import { GeoBanner } from "./GeoBanner";
import { RouteMapSection } from "./RouteMapSection";

interface ExecutionScreenProps {
  onOpenList: () => void;
  onOpenStop: (id: string) => void;
}

/** Ruta activa: mapa grande con toda la ruta y, abajo, la tarjeta de la tienda que toca. */
export function ExecutionScreen({ onOpenList, onOpenStop }: ExecutionScreenProps) {
  const view = useRouteView();
  const { askStopId, dismissAsk } = useArrivalDetection();
  const legs = useMemo(() => legByStopId(view.route.legsCache), [view.route.legsCache]);
  const next = view.next;
  const leg = next ? legs.get(next.id) : undefined;
  const done = view.delivered.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RouteMapSection className="min-h-0 flex-1" onMarkerClick={onOpenStop}>
        <p className="absolute left-3 top-3 z-10 rounded-xl border-2 border-ink bg-paper px-3 py-1 text-sm font-bold shadow-md">
          {done} de {view.stops.length} entregadas
        </p>
      </RouteMapSection>
      <section
        className="pb-safe flex shrink-0 flex-col gap-3 border-t-2 border-ink px-3 pt-3"
        aria-label="Entrega en curso"
        aria-live="polite"
      >
        <GeoBanner />
        {view.route.legsCache?.approximate && (
          <p className="text-sm font-semibold text-warn">Ruta aproximada (sin conexión al servicio de rutas).</p>
        )}
        {next && (
          <DeliveryCard
            key={next.id}
            stop={next}
            legText={leg ? `${formatDistance(leg.distanceM)} · ${formatDuration(leg.durationS)}` : undefined}
            askArrival={askStopId === next.id}
            onDismissAsk={dismissAsk}
            onOpenList={onOpenList}
          />
        )}
      </section>
    </div>
  );
}
