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
        <p className="text-sm font-bold uppercase tracking-wide text-ok">Ruta finalizada</p>
        <h2 className="text-3xl font-extrabold">
          {delivered.length} {delivered.length === 1 ? "tienda entregada" : "tiendas entregadas"}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-base">
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-sm text-ink-soft">Inicio</dt>
            <dd className="text-xl font-bold">{formatTime(route.startedAt)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-3">
            <dt className="text-sm text-ink-soft">Fin</dt>
            <dd className="text-xl font-bold">{formatTime(route.finishedAt)}</dd>
          </div>
        </dl>
        <ol className="mt-4 flex flex-col gap-2">
          {byTime.map((stop, index) => (
            <li key={stop.id}>
              <button
                type="button"
                onClick={() => onOpenStop(stop.id)}
                className="flex min-h-14 w-full flex-col rounded-xl border-2 border-line px-3 py-2 text-left"
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="truncate font-bold">
                    {index + 1}. {stop.name}
                  </span>
                  <span className="shrink-0 text-sm text-ink-soft">{formatTime(stop.deliveredAt)}</span>
                </span>
                {stop.note && <span className="text-sm text-ink-soft">Observación: {stop.note}</span>}
              </button>
            </li>
          ))}
        </ol>
      </section>
      <footer className="pb-safe shrink-0 border-t-2 border-line px-3 pt-3">
        <Button big className="w-full" onClick={onNewRoute}>
          Nueva ruta
        </Button>
      </footer>
    </div>
  );
}
