"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Driver } from "@/features/drivers/api";
import { formatRouteLabel, type RouteStopDetail, type RouteWithStops } from "@/features/routes/api";
import { useRouteDetailActions } from "@/features/routes/useRouteDetailActions";
import type { StoreRecord } from "@/features/stores/api";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { OrderSheet } from "./OrderSheet";
import { RouteInfoCard } from "./RouteInfoCard";
import { RouteStopsEditor } from "./RouteStopsEditor";
import { StorePickerSheet } from "./StorePickerSheet";

interface RouteDetailScreenProps {
  route: RouteWithStops;
  drivers: Driver[];
  catalogStores: StoreRecord[];
  currentUserId: string;
}

export function RouteDetailScreen({ route: initialRoute, drivers, catalogStores, currentUserId }: RouteDetailScreenProps) {
  const {
    route,
    busy,
    error,
    activate,
    finish,
    assignDriver,
    cancel,
    addStops,
    removeStop,
    reorder,
    optimize,
    optimizing,
    optimizeNotice,
    updateStopDetail,
  } = useRouteDetailActions(initialRoute, currentUserId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toRemoveStop, setToRemoveStop] = useState<RouteStopDetail | null>(null);
  const [toCancel, setToCancel] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);

  const driverName = drivers.find((driver) => driver.id === route.driverId)?.name;
  const excludeStoreIds = new Set(route.stops.map((stop) => stop.storeId).filter((id): id is string => Boolean(id)));
  const editingStop = route.stops.find((stop) => stop.id === editingStopId) ?? null;
  const pendingCount = route.stops.filter((stop) => stop.status === "pending").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <AdminSectionHeader title={formatRouteLabel(driverName, route.createdAt)} backHref="/admin" />
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
      {optimizeNotice && <Banner tone="warn">{optimizeNotice}</Banner>}
      <RouteInfoCard
        route={route}
        drivers={drivers}
        busy={busy}
        onAssignDriver={assignDriver}
        onActivate={activate}
        onFinish={finish}
        onCancel={() => setToCancel(true)}
      />
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-wide text-soft">Tiendas ({route.stops.length})</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" icon="bolt" disabled={optimizing || pendingCount < 2} onClick={optimize}>
              {optimizing ? "Optimizando…" : "Optimizar ruta"}
            </Button>
            <Button variant="secondary" icon="plus" onClick={() => setPickerOpen(true)}>
              Agregar
            </Button>
          </div>
        </div>
        <RouteStopsEditor
          stops={route.stops}
          onReorder={reorder}
          onRemove={setToRemoveStop}
          onEditOrder={(stop) => setEditingStopId(stop.id)}
        />
      </section>
      {editingStop && (
        <OrderSheet
          routeId={route.id}
          stop={editingStop}
          currentUserId={currentUserId}
          onClose={() => setEditingStopId(null)}
          onUpdated={updateStopDetail}
        />
      )}
      {pickerOpen && (
        <StorePickerSheet
          catalogStores={catalogStores}
          excludeStoreIds={excludeStoreIds}
          createdBy={currentUserId}
          onConfirm={addStops}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {toRemoveStop && (
        <ConfirmDialog
          title="Quitar tienda"
          message={`${toRemoveStop.name} se quita de esta ruta (el registro no se borra).`}
          confirmLabel="Quitar"
          destructive
          onConfirm={() => {
            removeStop(toRemoveStop);
            setToRemoveStop(null);
          }}
          onCancel={() => setToRemoveStop(null)}
        />
      )}
      {toCancel && (
        <ConfirmDialog
          title="Cancelar ruta"
          message="La ruta queda cancelada; el registro no se borra."
          confirmLabel="Cancelar ruta"
          destructive
          onConfirm={() => {
            cancel();
            setToCancel(false);
          }}
          onCancel={() => setToCancel(false)}
        />
      )}
    </div>
  );
}
