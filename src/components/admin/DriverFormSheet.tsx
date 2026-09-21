"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { createDriver, updateDriver, type Driver } from "@/features/drivers/api";
import { createClient } from "@/lib/supabase/client";

interface DriverFormSheetProps {
  /** Presente = editar; ausente = alta nueva. */
  driver?: Driver;
  createdBy: string;
  onSaved: (driver: Driver) => void;
  onClose: () => void;
}

export function DriverFormSheet({ driver, createdBy, onSaved, onClose }: DriverFormSheetProps) {
  const [name, setName] = useState(driver?.name ?? "");
  const [phone, setPhone] = useState(driver?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    if (name.trim() === "") {
      setError("Escribe un nombre.");
      return;
    }
    setBusy(true);
    setError(undefined);
    const supabase = createClient();
    try {
      const saved = driver
        ? await updateDriver(supabase, driver.id, { name, phone: phone.trim() || null })
        : await createDriver(supabase, { name, phone: phone.trim() || undefined }, createdBy);
      onSaved(saved);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={driver ? "Editar chofer" : "Nuevo chofer"}
      onClose={onClose}
      footer={
        <Button big icon="check" onClick={save} disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField label="Nombre" value={name} onChange={setName} disabled={busy} />
        <TextField
          label="Teléfono (opcional)"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={setPhone}
          disabled={busy}
        />
        {error && (
          <Banner tone="danger" role="alert">
            {error}
          </Banner>
        )}
      </div>
    </Sheet>
  );
}
