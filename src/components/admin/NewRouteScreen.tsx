"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FIELD_CLASS } from "@/components/ui/TextField";
import type { Driver } from "@/features/drivers/api";
import { createRoute } from "@/features/routes/api";
import { addRouteStop } from "@/features/routes/routeStops";
import type { StoreRecord } from "@/features/stores/api";
import { createClient } from "@/lib/supabase/client";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { DriverFormSheet } from "./DriverFormSheet";
import { StorePickerSheet } from "./StorePickerSheet";

interface NewRouteScreenProps {
  drivers: Driver[];
  catalogStores: StoreRecord[];
  currentUserId: string;
}

export function NewRouteScreen({ drivers: initialDrivers, catalogStores, currentUserId }: NewRouteScreenProps) {
  const router = useRouter();
  const [drivers, setDrivers] = useState(initialDrivers);
  const [driverId, setDriverId] = useState("");
  const [stagedStores, setStagedStores] = useState<StoreRecord[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [driverSheetOpen, setDriverSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  const removeStaged = (id: string) => setStagedStores((prev) => prev.filter((store) => store.id !== id));

  const confirm = async () => {
    setCreating(true);
    setError(undefined);
    const supabase = createClient();
    try {
      const route = await createRoute(supabase, { driverId: driverId || null }, currentUserId);
      // Secuencial: cada `addRouteStop` calcula la posición leyendo la última — en paralelo dos
      // altas podrían leer la misma posición y pisarse (ver docs/DECISIONS.md).
      for (const store of stagedStores) {
        await addRouteStop(supabase, { routeId: route.id, storeId: store.id, name: store.name, lat: store.lat, lng: store.lng });
      }
      router.push(`/admin/routes/${route.id}`);
    } catch {
      setError("No se pudo crear la ruta. Intenta de nuevo.");
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
      <AdminSectionHeader title="Nueva ruta" backHref="/admin" />
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-soft">Chofer (opcional)</h3>
        <select
          className={FIELD_CLASS}
          value={driverId}
          onChange={(event) => setDriverId(event.target.value)}
          aria-label="Chofer asignado"
        >
          <option value="">Sin asignar</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
        <Button variant="secondary" icon="plus" onClick={() => setDriverSheetOpen(true)}>
          Nuevo chofer
        </Button>
      </section>
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-soft">Tiendas ({stagedStores.length})</h3>
          <Button variant="secondary" icon="plus" onClick={() => setPickerOpen(true)}>
            Agregar
          </Button>
        </div>
        {stagedStores.length === 0 && <p className="text-sm text-soft">Todavía no agregaste tiendas.</p>}
        <ul className="flex flex-col gap-2">
          {stagedStores.map((store, index) => (
            <li
              key={store.id}
              className="flex min-h-12 items-center justify-between gap-2 rounded-xl border-2 border-line bg-card px-3"
            >
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                {index + 1}. {store.name}
              </span>
              <button
                type="button"
                onClick={() => removeStaged(store.id)}
                aria-label={`Quitar ${store.name}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-danger active:bg-danger-tint"
              >
                <Icon name="trash" size={20} />
              </button>
            </li>
          ))}
        </ul>
      </section>
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
      <Button big icon="check" onClick={confirm} disabled={creating}>
        {creating ? "Creando…" : "Crear ruta"}
      </Button>
      {pickerOpen && (
        <StorePickerSheet
          catalogStores={catalogStores}
          excludeStoreIds={new Set(stagedStores.map((store) => store.id))}
          createdBy={currentUserId}
          onConfirm={(stores) => setStagedStores((prev) => [...prev, ...stores])}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {driverSheetOpen && (
        <DriverFormSheet
          createdBy={currentUserId}
          onSaved={(driver) => {
            setDrivers((prev) => [...prev, driver].sort((a, b) => a.name.localeCompare(b.name)));
            setDriverId(driver.id);
            setDriverSheetOpen(false);
          }}
          onClose={() => setDriverSheetOpen(false)}
        />
      )}
    </div>
  );
}
