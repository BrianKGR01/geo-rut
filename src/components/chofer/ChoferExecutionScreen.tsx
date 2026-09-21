"use client";

import { useMemo, useState } from "react";
import { GeoBanner } from "@/components/route/GeoBanner";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { legByStopId } from "@/features/route/planRoute";
import { useChoferRoute } from "@/features/route/useChoferRoute";
import { formatDistance, formatDuration } from "@/lib/format";
import { ChoferDeliveryCard } from "./ChoferDeliveryCard";
import { ChoferMessageScreen } from "./ChoferMessageScreen";
import { ChoferRouteMapSection } from "./ChoferRouteMapSection";
import { ChoferStopListSheet } from "./ChoferStopListSheet";
import { ChoferStopSheet } from "./ChoferStopSheet";

interface ChoferExecutionScreenProps {
  routeId: string;
  /** La ruta dejó de estar accesible (finalizada, cancelada o vuelta a borrador): hay que pedir otro código. */
  onLostAccess: () => void;
}

/** Igual que `components/route/ExecutionScreen.tsx` (v1): mapa + tarjeta de la tienda que toca, ahora contra Supabase. */
export function ChoferExecutionScreen({ routeId, onLostAccess }: ChoferExecutionScreenProps) {
  const hook = useChoferRoute(routeId);
  const [listOpen, setListOpen] = useState(false);
  const [detailStopId, setDetailStopId] = useState<string>();
  const legs = useMemo(() => legByStopId(hook.legsCache), [hook.legsCache]);

  if (hook.status === "loading") return <ChoferMessageScreen title="Cargando tu ruta…" />;
  if (hook.status === "not-found") {
    return (
      <ChoferMessageScreen
        title="Ya no tienes acceso a esta ruta"
        message="Puede que haya finalizado o que el administrador la haya cancelado."
        action={<Button onClick={onLostAccess}>Ingresar otro código</Button>}
      />
    );
  }
  if (hook.status === "error" || !hook.view) {
    return (
      <ChoferMessageScreen
        title="No se pudo cargar la ruta"
        message="Revisa tu conexión e intenta de nuevo."
        action={<Button onClick={() => void hook.refresh()}>Reintentar</Button>}
      />
    );
  }

  const { view, legsCache, startPoint, error, askStopId, dismissAsk, markArrived, markDelivered, setNote, undoStop, uploadPhoto } = hook;
  const next = view.next;
  const leg = next ? legs.get(next.id) : undefined;
  const done = view.delivered.length;
  const total = view.stops.length;
  const someoneDelivering = view.remaining.some((stop) => stop.status === "delivering");
  const detailStop = [...view.remaining, ...view.delivered].find((stop) => stop.id === detailStopId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChoferRouteMapSection
        className="min-h-0 flex-1"
        onMarkerClick={setDetailStopId}
        groups={view}
        nextId={next?.id}
        routeStatus={view.route.status}
        stopOrder={view.route.stopOrder}
        startPoint={startPoint}
        legsCache={legsCache}
      >
        <div className="absolute left-3 top-3 z-10 rounded-xl border-2 border-strong bg-card px-3 py-1.5 shadow-md" role="status">
          <p className="font-display text-xl font-bold leading-none">
            {done} / {total} <span className="text-sm font-semibold text-soft">entregadas</span>
          </p>
          <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-raised" aria-hidden="true">
            <div className="h-full rounded-full bg-ok-solid" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>
      </ChoferRouteMapSection>
      <section
        className="pb-safe flex shrink-0 flex-col gap-3 border-t-2 border-strong bg-card px-3 pt-3"
        aria-label="Entrega en curso"
        aria-live="polite"
      >
        <GeoBanner />
        {error && (
          <Banner tone="danger" role="alert">
            {error}
          </Banner>
        )}
        {legsCache?.approximate && <p className="text-sm font-semibold text-warn">Ruta aproximada (sin conexión al servicio de rutas).</p>}
        {next ? (
          <ChoferDeliveryCard
            key={next.id}
            stop={next}
            legText={leg ? `${formatDistance(leg.distanceM)} · ${formatDuration(leg.durationS)}` : undefined}
            askArrival={askStopId === next.id}
            onDismissAsk={dismissAsk}
            onOpenList={() => setListOpen(true)}
            onMarkArrived={markArrived}
            onMarkDelivered={markDelivered}
            onSetNote={setNote}
            onUndo={undoStop}
            onUploadPhoto={uploadPhoto}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Icon name="check" size={32} className="text-ok" />
            <p className="font-display text-2xl font-bold uppercase tracking-wide">Ruta completa</p>
            <p className="text-soft">Entregaste todas las tiendas. Avisa al administrador para cerrar la ruta.</p>
            {total > 0 && (
              <Button variant="secondary" icon="list" onClick={() => setListOpen(true)}>
                Ver lista
              </Button>
            )}
          </div>
        )}
      </section>
      {listOpen && (
        <ChoferStopListSheet
          delivered={view.delivered}
          remaining={view.remaining}
          nextId={next?.id}
          legsCache={legsCache}
          onClose={() => setListOpen(false)}
          onOpenStop={(id) => {
            setListOpen(false);
            setDetailStopId(id);
          }}
        />
      )}
      {detailStop && (
        <ChoferStopSheet
          stop={detailStop}
          someoneDelivering={someoneDelivering}
          onClose={() => setDetailStopId(undefined)}
          onMarkArrived={markArrived}
          onUndo={undoStop}
        />
      )}
    </div>
  );
}
