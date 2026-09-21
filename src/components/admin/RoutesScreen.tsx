"use client";

import Link from "next/link";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button, buttonClass } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Driver } from "@/features/drivers/api";
import { activateRoute, cancelRoute, finishRoute, formatRouteLabel, type RouteSummary } from "@/features/routes/api";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseDb } from "@/lib/supabase/types";
import { RouteStatusBadge } from "./RouteStatusBadge";

interface RoutesScreenProps {
  routes: RouteSummary[];
  drivers: Driver[];
  currentUserId: string;
}

export function RoutesScreen({ routes: initialRoutes, drivers, currentUserId }: RoutesScreenProps) {
  const [routes, setRoutes] = useState(initialRoutes);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toCancel, setToCancel] = useState<RouteSummary | null>(null);
  const [error, setError] = useState<string>();

  const driverName = (id: string | null) => drivers.find((driver) => driver.id === id)?.name;

  const runAction = async (route: RouteSummary, action: (supabase: SupabaseDb) => Promise<RouteSummary>) => {
    setBusyId(route.id);
    setError(undefined);
    try {
      const updated = await action(createClient());
      setRoutes((prev) => prev.map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch {
      setError("No se pudo actualizar la ruta. Intenta de nuevo.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    setBusyId(toCancel.id);
    setError(undefined);
    try {
      await cancelRoute(createClient(), toCancel.id, currentUserId);
      setRoutes((prev) => prev.filter((route) => route.id !== toCancel.id));
    } catch {
      setError("No se pudo cancelar la ruta. Intenta de nuevo.");
    } finally {
      setBusyId(null);
      setToCancel(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <nav className="flex gap-2">
        <Link href="/admin/drivers" className={buttonClass("secondary")}>
          Choferes
        </Link>
        <Link href="/admin/admins" className={buttonClass("secondary")}>
          Administradores
        </Link>
        <Link href="/admin/stores" className={buttonClass("secondary")}>
          Tiendas
        </Link>
      </nav>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">Rutas</h2>
        <Link href="/admin/routes/new" className={buttonClass("primary")}>
          + Nueva ruta
        </Link>
      </div>
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
      {routes.length === 0 && <p className="text-sm text-soft">Todavía no hay rutas.</p>}
      <ul className="flex flex-col gap-2">
        {routes.map((route) => (
          <li key={route.id} className="rounded-xl border-2 border-line bg-card p-3">
            <Link href={`/admin/routes/${route.id}`} className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                {formatRouteLabel(driverName(route.driverId), route.createdAt)}
              </span>
              <RouteStatusBadge status={route.status} />
            </Link>
            {route.status === "draft" && (
              <div className="mt-2 flex gap-2">
                <Button
                  variant="success"
                  className="flex-1"
                  disabled={busyId === route.id}
                  onClick={() => runAction(route, (supabase) => activateRoute(supabase, route.id))}
                >
                  Activar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={busyId === route.id}
                  onClick={() => setToCancel(route)}
                >
                  Cancelar
                </Button>
              </div>
            )}
            {route.status === "active" && (
              <div className="mt-2">
                <Button
                  variant="success"
                  className="w-full"
                  disabled={busyId === route.id}
                  onClick={() => runAction(route, (supabase) => finishRoute(supabase, route.id))}
                >
                  Finalizar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {toCancel && (
        <ConfirmDialog
          title="Cancelar ruta"
          message="La ruta queda cancelada; el registro no se borra."
          confirmLabel="Cancelar ruta"
          destructive
          onConfirm={confirmCancel}
          onCancel={() => setToCancel(null)}
        />
      )}
    </div>
  );
}
