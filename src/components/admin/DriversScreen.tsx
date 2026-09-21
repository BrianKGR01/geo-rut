"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { deactivateDriver, type Driver } from "@/features/drivers/api";
import { createClient } from "@/lib/supabase/client";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { DriverFormSheet } from "./DriverFormSheet";

type Sheet = { kind: "create" } | { kind: "edit"; driver: Driver };

interface DriversScreenProps {
  drivers: Driver[];
  currentUserId: string;
}

export function DriversScreen({ drivers: initialDrivers, currentUserId }: DriversScreenProps) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Driver | null>(null);
  const [error, setError] = useState<string>();

  const handleSaved = (driver: Driver) => {
    setDrivers((prev) => {
      const exists = prev.some((existing) => existing.id === driver.id);
      const next = exists ? prev.map((existing) => (existing.id === driver.id ? driver : existing)) : [...prev, driver];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setSheet(null);
  };

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    setError(undefined);
    const supabase = createClient();
    try {
      await deactivateDriver(supabase, toDeactivate.id, currentUserId);
      setDrivers((prev) => prev.filter((driver) => driver.id !== toDeactivate.id));
    } catch {
      setError("No se pudo dar de baja. Intenta de nuevo.");
    } finally {
      setToDeactivate(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <AdminSectionHeader
        title="Choferes"
        backHref="/admin"
        action={
          <Button icon="plus" onClick={() => setSheet({ kind: "create" })}>
            Nuevo
          </Button>
        }
      />
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
      {drivers.length === 0 && <p className="text-sm text-soft">Todavía no hay choferes.</p>}
      <ul className="flex flex-col gap-2">
        {drivers.map((driver) => (
          <li
            key={driver.id}
            className="flex min-h-14 items-center justify-between gap-2 rounded-xl border-2 border-line bg-card px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{driver.name}</p>
              {driver.phone && <p className="text-sm text-soft">{driver.phone}</p>}
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setSheet({ kind: "edit", driver })}
                aria-label={`Editar ${driver.name}`}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-via active:bg-via-tint"
              >
                <Icon name="edit" size={20} />
              </button>
              <button
                type="button"
                onClick={() => setToDeactivate(driver)}
                aria-label={`Dar de baja a ${driver.name}`}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-danger active:bg-danger-tint"
              >
                <Icon name="trash" size={20} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {sheet && (
        <DriverFormSheet
          driver={sheet.kind === "edit" ? sheet.driver : undefined}
          createdBy={currentUserId}
          onSaved={handleSaved}
          onClose={() => setSheet(null)}
        />
      )}
      {toDeactivate && (
        <ConfirmDialog
          title="Dar de baja chofer"
          message={`${toDeactivate.name} ya no va a aparecer para asignar a nuevas rutas.`}
          confirmLabel="Dar de baja"
          destructive
          onConfirm={confirmDeactivate}
          onCancel={() => setToDeactivate(null)}
        />
      )}
    </div>
  );
}
