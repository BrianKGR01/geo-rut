"use client";

import { useState } from "react";
import type { Stop } from "@/types/domain";
import { StopRow } from "./StopRow";

interface StopListPanelProps {
  delivered: Stop[];
  remaining: Stop[];
  nextId?: string;
  onOpenStop: (id: string) => void;
}

export function StopListPanel({ delivered, remaining, nextId, onOpenStop }: StopListPanelProps) {
  const [showDelivered, setShowDelivered] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {delivered.length > 0 && (
        <section aria-label="Tiendas entregadas" className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowDelivered((open) => !open)}
            aria-expanded={showDelivered}
            className="flex min-h-12 items-center justify-between rounded-xl bg-ok-soft px-3 text-left font-bold text-ok"
          >
            <span>Entregadas ({delivered.length})</span>
            <span aria-hidden="true">{showDelivered ? "▲" : "▼"}</span>
          </button>
          {showDelivered &&
            delivered.map((stop) => (
              <StopRow key={stop.id} stop={stop} label="✓" onOpen={() => onOpenStop(stop.id)} />
            ))}
        </section>
      )}
      <ol className="flex flex-col gap-2" aria-label="Tiendas por visitar">
        {remaining.map((stop, index) => (
          <li key={stop.id}>
            <StopRow
              stop={stop}
              label={String(index + 1)}
              highlighted={stop.id === nextId}
              onOpen={() => onOpenStop(stop.id)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
