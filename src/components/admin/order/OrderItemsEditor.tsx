"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { FIELD_CLASS } from "@/components/ui/TextField";
import {
  createRouteStopItem,
  removeRouteStopItem,
  updateRouteStopItem,
  type RouteStopItem,
  type RouteStopItemPatch,
} from "@/features/routes/routeStopItems";
import { createClient } from "@/lib/supabase/client";
import { OrderItemRow } from "./OrderItemRow";

interface OrderItemsEditorProps {
  routeStopId: string;
  items: RouteStopItem[];
  currentUserId: string;
  onChange: (items: RouteStopItem[]) => void;
}

/** Partidas del pedido ("productos"): independientes del monto total, no se valida que sumen igual. */
export function OrderItemsEditor({ routeStopId, items, currentUserId, onChange }: OrderItemsEditorProps) {
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

  const add = async () => {
    if (description.trim() === "") {
      setError("Escribe una descripción.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const created = await createRouteStopItem(createClient(), {
        routeStopId,
        description,
        quantity: quantity.trim() === "" ? null : Number(quantity),
      });
      onChange([...items, created]);
      setDescription("");
      setQuantity("");
    } catch {
      setError("No se pudo agregar la partida. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const save = async (item: RouteStopItem, patch: RouteStopItemPatch) => {
    setError(undefined);
    try {
      const updated = await updateRouteStopItem(createClient(), item.id, patch);
      onChange(items.map((existing) => (existing.id === item.id ? updated : existing)));
    } catch {
      setError("No se pudo guardar la partida. Intenta de nuevo.");
    }
  };

  const remove = async (item: RouteStopItem) => {
    setBusy(true);
    setError(undefined);
    try {
      await removeRouteStopItem(createClient(), item.id, currentUserId);
      onChange(items.filter((existing) => existing.id !== item.id));
    } catch {
      setError("No se pudo quitar la partida. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-2 rounded-xl border-2 border-line bg-card p-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-soft">
        Partidas{totalQuantity > 0 ? ` · ${totalQuantity} en total` : ""}
      </h3>
      {items.length === 0 && <p className="text-sm text-soft">Sin partidas todavía.</p>}
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <OrderItemRow key={item.id} item={item} busy={busy} onSave={(patch) => save(item, patch)} onRemove={() => remove(item)} />
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={`${FIELD_CLASS} min-w-0 flex-1`}
          placeholder="Descripción"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={busy}
          maxLength={200}
          aria-label="Descripción de la nueva partida"
        />
        <input
          className={`${FIELD_CLASS} w-20 shrink-0`}
          type="number"
          inputMode="decimal"
          placeholder="Cant."
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          disabled={busy}
          aria-label="Cantidad de la nueva partida"
        />
      </div>
      <Button variant="secondary" icon="plus" onClick={add} disabled={busy}>
        Agregar partida
      </Button>
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
    </section>
  );
}
