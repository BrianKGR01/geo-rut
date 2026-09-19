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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1 px-3 py-1.5">
      <p className="truncate font-display text-2xl font-bold leading-none">{value}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-soft">{label}</p>
    </div>
  );
}

/** Totales de lo pendiente + aviso de ruta aproximada. */
export function PlanSummary({ pendingCount, orderMode, cache, calculating }: PlanSummaryProps) {
  const totals = routeTotals(cache);
  const orderLabel = calculating ? "Calculando ruta…" : orderMode === "optimized" ? "Orden optimizado" : "Orden manual";
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex divide-x-2 divide-line rounded-xl border-2 border-line bg-card">
        <Stat value={String(pendingCount)} label={pendingCount === 1 ? "pendiente" : "pendientes"} />
        <Stat value={cache ? formatDistance(totals.distanceM) : "—"} label="distancia" />
        <Stat value={cache ? formatDuration(totals.durationS) : "—"} label="manejo" />
      </div>
      <p className="sr-only">{orderLabel}</p>
      {cache?.approximate && (
        <Banner tone="warn">Ruta aproximada (sin conexión al servicio de rutas).</Banner>
      )}
    </div>
  );
}
