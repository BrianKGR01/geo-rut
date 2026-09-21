"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { pedidoMontoInputSchema, updateRouteStop } from "@/features/routes/routeStops";
import { formatMonto } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

interface OrderMontoFieldProps {
  routeStopId: string;
  pedidoMonto: number | null;
  onSaved: (pedidoMonto: number | null) => void;
}

const asText = (value: number | null) => (value !== null ? String(value) : "");

/** Monto total del pedido (Bs, múltiplo de 5). Independiente de las partidas, ver `OrderItemsEditor`. */
export function OrderMontoField({ routeStopId, pedidoMonto, onSaved }: OrderMontoFieldProps) {
  const [value, setValue] = useState(asText(pedidoMonto));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const changed = value.trim() !== asText(pedidoMonto);

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed !== "" && Number.isNaN(Number(trimmed))) {
      setError("Escribe un número válido.");
      return;
    }
    const parsed = pedidoMontoInputSchema.safeParse(trimmed === "" ? null : Number(trimmed));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa el monto.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const updated = await updateRouteStop(createClient(), routeStopId, { pedidoMonto: parsed.data });
      setValue(asText(updated.pedidoMonto));
      onSaved(updated.pedidoMonto);
    } catch {
      setError("No se pudo guardar el monto. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-2 rounded-xl border-2 border-line bg-card p-3">
      <TextField
        label="Monto total (Bs, opcional)"
        type="number"
        inputMode="decimal"
        step={5}
        min={0}
        placeholder="Ej.: 120"
        value={value}
        onChange={(next) => {
          setValue(next);
          setError(undefined);
        }}
        disabled={busy}
      />
      {pedidoMonto !== null && !changed && <p className="text-sm text-soft">Cargado: {formatMonto(pedidoMonto)}</p>}
      {changed && (
        <Button icon="check" onClick={save} disabled={busy}>
          {busy ? "Guardando…" : "Guardar monto"}
        </Button>
      )}
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
    </section>
  );
}
