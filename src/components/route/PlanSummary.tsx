"use client";

import { Banner } from "@/components/ui/Banner";
import { routeTotals } from "@/features/route/planRoute";
import { formatDistance, formatDuration } from "@/lib/format";
import type { LegsCache, OrderMode } from "@/types/domain";

interface PlanSummaryProps {
  pendingCount: number;
  orderMode: OrderMode;
  cache?: LegsCache;
  calculating: boolean;
}

/** Totales de lo pendiente + aviso de ruta aproximada. */
export function PlanSummary({ pendingCount, orderMode, cache, calculating }: PlanSummaryProps) {
  const totals = routeTotals(cache);
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <p className="flex flex-wrap items-baseline gap-x-2 text-base">
        <span className="font-extrabold">
          {pendingCount} {pendingCount === 1 ? "pendiente" : "pendientes"}
        </span>
        {cache && (
          <span className="font-semibold">
            · {formatDistance(totals.distanceM)} · {formatDuration(totals.durationS)}
          </span>
        )}
        <span className="text-sm text-ink-soft">
          {calculating ? "Calculando ruta…" : orderMode === "optimized" ? "Orden optimizado" : "Orden manual"}
        </span>
      </p>
      {cache?.approximate && (
        <Banner tone="warn">Ruta aproximada (sin conexión al servicio de rutas).</Banner>
      )}
    </div>
  );
}
