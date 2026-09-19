"use client";

import { Button } from "@/components/ui/Button";
import { useRouteView } from "@/features/route/useRouteView";
import { formatTime } from "@/lib/format";

interface RouteSummaryProps {
  onOpenStop: (id: string) => void;
  onNewRoute: () => void;
}

export function RouteSummary({ onOpenStop, onNewRoute }: RouteSummaryProps) {
  const { delivered, route } = useRouteView();
  const byTime = [...delivered].sort((a, b) => (a.deliveredAt ?? "").localeCompare(b.deliveredAt ?? ""));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="min-h-0 flex-1 overflow-y-auto p-4" aria-label="Resumen de la ruta">
        <p className="inline-block rounded-md bg-ok-solid px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
          Ruta finalizada
        </p>
        <h2 className="mt-1 font-display text-4xl font-bold uppercase leading-tight">
          {delivered.length} {delivered.length === 1 ? "tienda entregada" : "tiendas entregadas"}
        </h2>
        <dl className="mt-3 flex divide-x-2 divide-line rounded-xl border-2 border-line bg-card">
          <div className="flex-1 px-3 py-2">
            <dt className="text-xs font-bold uppercase tracking-wide text-soft">Inicio</dt>
            <dd className="font-display text-3xl font-bold leading-none">{formatTime(route.startedAt)}</dd>
          </div>
          <div className="flex-1 px-3 py-2">
            <dt className="text-xs font-bold uppercase tracking-wide text-soft">Fin</dt>
            <dd className="font-display text-3xl font-bold leading-none">{formatTime(route.finishedAt)}</dd>
          </div>
        </dl>
        <ol className="mt-4 flex flex-col gap-2">
          {byTime.map((stop, index) => (
            <li key={stop.id}>
              <button
                type="button"
                onClick={() => onOpenStop(stop.id)}
                className="flex min-h-14 w-full flex-col justify-center rounded-xl border-2 border-line bg-card px-3 py-2 text-left active:bg-raised"
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="truncate text-lg font-bold">
                    {index + 1}. {stop.name}
                  </span>
                  <span className="shrink-0 font-display text-lg font-semibold text-soft">
                    {formatTime(stop.deliveredAt)}
                  </span>
                </span>
                {stop.note && <span className="text-sm text-soft">Observación: {stop.note}</span>}
              </button>
            </li>
          ))}
        </ol>
      </section>
      <footer className="pb-safe shrink-0 border-t-2 border-strong bg-card px-3 pt-3">
        <Button big icon="plus" className="w-full" onClick={onNewRoute}>
          Nueva ruta
        </Button>
      </footer>
    </div>
  );
}
