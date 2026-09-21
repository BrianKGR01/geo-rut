"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { FIELD_CLASS } from "@/components/ui/TextField";
import type { RouteStopItem, RouteStopItemPatch } from "@/features/routes/routeStopItems";

interface OrderItemRowProps {
  item: RouteStopItem;
  busy: boolean;
  onSave: (patch: RouteStopItemPatch) => void;
  onRemove: () => void;
}

const quantityText = (value: number | null) => (value !== null ? String(value) : "");

/** Una partida: descripción y cantidad se editan in situ (se guardan al salir del campo). */
export function OrderItemRow({ item, busy, onSave, onRemove }: OrderItemRowProps) {
  const [description, setDescription] = useState(item.description);
  const [quantity, setQuantity] = useState(quantityText(item.quantity));

  const commitDescription = () => {
    const trimmed = description.trim();
    if (trimmed === "") {
      setDescription(item.description);
      return;
    }
    if (trimmed !== item.description) onSave({ description: trimmed });
  };

  const commitQuantity = () => {
    const trimmed = quantity.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && Number.isNaN(next)) {
      setQuantity(quantityText(item.quantity));
      return;
    }
    if (next !== item.quantity) onSave({ quantity: next });
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border-2 border-line bg-page px-2 py-1.5">
      <input
        className={`${FIELD_CLASS} min-w-0 flex-1 px-2 py-1.5 text-sm`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        onBlur={commitDescription}
        disabled={busy}
        maxLength={200}
        aria-label={`Descripción de ${item.description}`}
      />
      <input
        className={`${FIELD_CLASS} w-16 shrink-0 px-2 py-1.5 text-sm`}
        type="number"
        inputMode="decimal"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        onBlur={commitQuantity}
        disabled={busy}
        aria-label={`Cantidad de ${item.description}`}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        aria-label={`Quitar ${item.description}`}
        className="shrink-0 p-1 text-danger disabled:opacity-45"
      >
        <Icon name="trash" size={18} />
      </button>
    </div>
  );
}
