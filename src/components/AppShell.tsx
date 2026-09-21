"use client";

import { useState } from "react";
import { START_MARKER_ID } from "@/features/route/markers";
import { useGeolocationLifecycle } from "@/features/route/useGeolocationLifecycle";
import { useRoutePlanner } from "@/features/route/useRoutePlanner";
import { useAppStore } from "@/lib/storage/store";
import { ExecutionScreen } from "./route/ExecutionScreen";
import { PlanScreen } from "./route/PlanScreen";
import { RouteSummary } from "./route/RouteSummary";
import { StartPointSheet } from "./route/StartPointSheet";
import { StartRouteButton } from "./route/StartRouteButton";
import { AddStopSheet } from "./stops/AddStopSheet";
import { BulkTransferSheet } from "./stops/BulkTransferSheet";
import { StopDeliveryActions } from "./stops/StopDeliveryActions";
import { StopDetailSheet } from "./stops/StopDetailSheet";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { Sheet } from "./ui/Sheet";
import { ThemeToggle } from "./ui/ThemeToggle";
import { useApplyTheme } from "./ui/useApplyTheme";
import { useHasMounted } from "./ui/useHasMounted";

type Overlay = { kind: "add" } | { kind: "start" } | { kind: "bulk" } | { kind: "detail"; id: string } | null;

export function AppShell() {
  const mounted = useHasMounted();
  const [listOpen, setListOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [confirmNewRoute, setConfirmNewRoute] = useState(false);
  const stops = useAppStore((state) => state.stops);
  const routeStatus = useAppStore((state) => state.route.status);
  const startNewRoute = useAppStore((state) => state.startNewRoute);
  const { calculating } = useRoutePlanner();
  useGeolocationLifecycle();
  useApplyTheme();

  const detailStop = overlay?.kind === "detail" ? stops.find((stop) => stop.id === overlay.id) : undefined;
  const hasPending = stops.some((stop) => stop.status !== "delivered");
  const openAdd = () => setOverlay({ kind: "add" });
  const openStart = () => setOverlay({ kind: "start" });
  const openBulk = () => setOverlay({ kind: "bulk" });
  const openStop = (id: string) => setOverlay(id === START_MARKER_ID ? { kind: "start" } : { kind: "detail", id });
  const closeOverlay = () => setOverlay(null);

  return (
    <div className="app-shell flex flex-col">
      <header className="pt-safe shrink-0 bg-chrome text-on-chrome">
        <div className="flex h-14 items-center justify-between pl-4 pr-1">
          <h1 className="font-display text-[26px] font-bold uppercase leading-none tracking-wide">
            Ruta<span className="text-signal">Tiendas</span>
          </h1>
          {mounted && (
            <div className="flex items-center">
              {stops.length > 0 && routeStatus !== "finished" && (
                <button
                  type="button"
                  onClick={() => setConfirmNewRoute(true)}
                  className="min-h-12 rounded-xl px-3 text-sm font-bold uppercase tracking-wide underline underline-offset-4 active:bg-white/15"
                >
                  Nueva ruta
                </button>
              )}
              <ThemeToggle />
            </div>
          )}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {!mounted && (
          <p className="m-auto text-soft" role="status">
            Cargando…
          </p>
        )}
        {mounted && routeStatus === "draft" && (
          <PlanScreen
            calculating={calculating}
            onAddStop={openAdd}
            onOpenStop={openStop}
            onChangeStart={openStart}
            onOpenBulk={openBulk}
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
        <Sheet title="Tiendas de la ruta" onClose={() => setListOpen(false)} closeKind="back" flush>
          <div className="flex h-full flex-col">
            <PlanScreen
              calculating={calculating}
              onAddStop={openAdd}
              onOpenStop={openStop}
              onChangeStart={openStart}
              onOpenBulk={openBulk}
            />
          </div>
        </Sheet>
      )}
      {overlay?.kind === "add" && <AddStopSheet onClose={closeOverlay} />}
      {overlay?.kind === "start" && <StartPointSheet onClose={closeOverlay} />}
      {overlay?.kind === "bulk" && <BulkTransferSheet onClose={closeOverlay} />}
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
          message="Se borran todas las tiendas, entregas y observaciones de esta ruta. Tu punto de partida y el tema se conservan."
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
