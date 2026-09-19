"use client";

import { useId, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button, buttonClass } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { googleMapsDirectionsUrl } from "@/features/delivery/mapsLink";
import { useAppStore } from "@/lib/storage/store";
import type { Stop } from "@/types/domain";

interface DeliveryCardProps {
  stop: Stop;
  legText?: string;
  /** El GPS es impreciso y la tienda podría estar cerca: hay que preguntar. */
  askArrival: boolean;
  onDismissAsk: () => void;
  onOpenList: () => void;
}

export function DeliveryCard({ stop, legText, askArrival, onDismissAsk, onOpenList }: DeliveryCardProps) {
  const { goToStop, markArrived, markDelivered, setDeliveryNote, undoStop } = useAppStore.getState();
  const [confirmUndo, setConfirmUndo] = useState(false);
  const noteId = useId();

  if (stop.status === "delivering") {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-warn">Entregando</p>
          <h2 className="truncate text-2xl font-extrabold">{stop.name}</h2>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={noteId} className="font-semibold">
            Observación (opcional)
          </label>
          <textarea
            id={noteId}
            className="min-h-20 w-full resize-none rounded-xl border-2 border-ink bg-paper px-3 py-2 text-base"
            placeholder="Ej.: recibió el encargado, faltó una caja…"
            value={stop.note ?? ""}
            maxLength={500}
            onChange={(event) => setDeliveryNote(stop.id, event.target.value)}
          />
        </div>
        <Button variant="success" big onClick={() => markDelivered(stop.id)}>
          Entregado
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmUndo(true)}>
            No he llegado
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onOpenList}>
            Ver lista
          </Button>
        </div>
        {confirmUndo && (
          <ConfirmDialog
            title="¿Volver a pendiente?"
            message={`${stop.name} volverá a “Pendiente”. La observación se conserva.`}
            confirmLabel="Sí, volver a pendiente"
            onCancel={() => setConfirmUndo(false)}
            onConfirm={() => {
              undoStop(stop.id);
              setConfirmUndo(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-brand-strong">Siguiente tienda</p>
        <h2 className="truncate text-2xl font-extrabold">{stop.name}</h2>
        {legText && <p className="text-base text-ink-soft">{legText}</p>}
      </div>
      {askArrival && (
        <Banner
          tone="warn"
          action={
            <Button variant="secondary" className="shrink-0" onClick={onDismissAsk}>
              Todavía no
            </Button>
          }
        >
          ¿Ya llegaste a {stop.name}? El GPS no es preciso aquí.
        </Banner>
      )}
      <a
        href={googleMapsDirectionsUrl(stop)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => goToStop(stop.id)}
        className={buttonClass("primary", true)}
      >
        Ir a la siguiente
      </a>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => markArrived(stop.id)}>
          Ya llegué
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onOpenList}>
          Ver lista
        </Button>
      </div>
    </div>
  );
}
