"use client";

import { useState } from "react";
import { useGeoStore } from "@/features/route/geoStore";
import { useGeolocationLifecycle } from "@/features/route/useGeolocationLifecycle";
import { useRoutePlanner } from "@/features/route/useRoutePlanner";
import { useAppStore } from "@/lib/storage/store";
import { DEFAULT_CENTER } from "./map/defaultCenter";
import { ExecutionScreen } from "./route/ExecutionScreen";
import { PlanScreen } from "./route/PlanScreen";
import { RouteSummary } from "./route/RouteSummary";
import { StartRouteButton } from "./route/StartRouteButton";
import { AddStopSheet } from "./stops/AddStopSheet";
import { StopDeliveryActions } from "./stops/StopDeliveryActions";
import { StopDetailSheet } from "./stops/StopDetailSheet";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Sheet } from "./ui/Sheet";
import { useHasMounted } from "./ui/useHasMounted";

type Overlay = { kind: "add" } | { kind: "detail"; id: string } | null;

export function AppShell() {
  const mounted = useHasMounted();
  const [listOpen, setListOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [confirmNewRoute, setConfirmNewRoute] = useState(false);
  const stops = useAppStore((state) => state.stops);
  const routeStatus = useAppStore((state) => state.route.status);
  const startNewRoute = useAppStore((state) => state.startNewRoute);
  const userPosition = useGeoStore((state) => state.position);
  const { calculating } = useRoutePlanner();
  useGeolocationLifecycle();

  const detailStop = overlay?.kind === "detail" ? stops.find((stop) => stop.id === overlay.id) : undefined;
  const hasPending = stops.some((stop) => stop.status !== "delivered");
  const openAdd = () => setOverlay({ kind: "add" });
  const openStop = (id: string) => setOverlay({ kind: "detail", id });
  const closeOverlay = () => setOverlay(null);

  return (
    <div className="app-shell flex flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b-2 border-ink pl-4 pr-1">
        <h1 className="text-xl font-extrabold tracking-tight">RutaTiendas</h1>
        {mounted && stops.length > 0 && routeStatus !== "finished" && (
          <button
            type="button"
            onClick={() => setConfirmNewRoute(true)}
            className="min-h-12 rounded-xl px-3 font-semibold text-brand-strong underline"
          >
            Nueva ruta
          </button>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {!mounted && (
          <p className="m-auto text-ink-soft" role="status">
            Cargando…
          </p>
        )}
        {mounted && routeStatus === "draft" && (
          <PlanScreen
            calculating={calculating}
            onAddStop={openAdd}
            onOpenStop={openStop}
            primaryAction={hasPending ? <StartRouteButton /> : undefined}
          />
        )}
        {mounted && routeStatus === "active" && (
          <ExecutionScreen onOpenList={() => setListOpen(true)} onOpenStop={openStop} />
        )}
        {mounted && routeStatus === "finished" && (
          <RouteSummary onOpenStop={openStop} onNewRoute={() => setConfirmNewRoute(true)} />
        )}
      </main>

      {listOpen && routeStatus === "active" && (
        <Sheet title="Tiendas de la ruta" onClose={() => setListOpen(false)} closeLabel="Volver" flush>
          <div className="flex h-full flex-col">
            <PlanScreen calculating={calculating} onAddStop={openAdd} onOpenStop={openStop} />
          </div>
        </Sheet>
      )}
      {overlay?.kind === "add" && (
        <AddStopSheet pickerCenter={userPosition ?? stops.at(-1) ?? DEFAULT_CENTER} onClose={closeOverlay} />
      )}
      {detailStop && (
        <StopDetailSheet
          key={detailStop.id}
          stop={detailStop}
          onClose={closeOverlay}
          deliveryActions={
            <StopDeliveryActions
              stop={detailStop}
              onDone={() => {
                // Tras "entregar igual" o deshacer, lo útil es volver a la tarjeta de entrega.
                closeOverlay();
                setListOpen(false);
              }}
            />
          }
        />
      )}
      {confirmNewRoute && (
        <ConfirmDialog
          title="¿Empezar una ruta nueva?"
          message="Se borran todas las tiendas, entregas y observaciones de esta ruta. No se puede deshacer."
          confirmLabel="Borrar y empezar de nuevo"
          destructive
          onCancel={() => setConfirmNewRoute(false)}
          onConfirm={() => {
            startNewRoute();
            setConfirmNewRoute(false);
            setListOpen(false);
            closeOverlay();
          }}
        />
      )}
    </div>
  );
}
