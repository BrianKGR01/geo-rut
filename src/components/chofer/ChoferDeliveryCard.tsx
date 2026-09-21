"use client";

import { useId, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button, buttonClass } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { FIELD_CLASS } from "@/components/ui/TextField";
import { googleMapsDirectionsUrl } from "@/features/delivery/mapsLink";
import type { ChoferStop } from "@/features/route/choferRouteMapping";
import { ChoferOrderPanel } from "./ChoferOrderPanel";

interface ChoferDeliveryCardProps {
  stop: ChoferStop;
  legText?: string;
  /** El GPS es impreciso y la tienda podría estar cerca: hay que preguntar. */
  askArrival: boolean;
  onDismissAsk: () => void;
  onOpenList: () => void;
  onMarkArrived: (stopId: string) => Promise<boolean>;
  onMarkDelivered: (stopId: string) => Promise<boolean>;
  onSetNote: (stopId: string, note: string) => void;
  onUndo: (stopId: string) => Promise<boolean>;
  onUploadPhoto: (stopId: string, file: File) => Promise<{ ok: true } | { ok: false; message: string }>;
}

/**
 * Misma tarjeta que `components/route/DeliveryCard.tsx` (v1), adaptada para recibir las acciones
 * por props (en vez de `useAppStore`) y mostrar el pedido (monto/partidas/fotos) solo mientras la
 * tienda está "Entregando" (RF-5, `docs/PLAN_V2.md` §4).
 */
export function ChoferDeliveryCard(props: ChoferDeliveryCardProps) {
  const { stop, legText, askArrival, onDismissAsk, onOpenList, onMarkArrived, onMarkDelivered, onSetNote, onUndo, onUploadPhoto } = props;
  const [confirmUndo, setConfirmUndo] = useState(false);
  const noteId = useId();

  if (stop.status === "delivering") {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="inline-block rounded-md bg-warn-solid px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            Entregando
          </p>
          <h2 className="mt-1 truncate font-display text-3xl font-bold leading-tight">{stop.name}</h2>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={noteId} className="text-sm font-bold uppercase tracking-wide text-soft">
            Observación (opcional)
          </label>
          <textarea
            id={noteId}
            className={`${FIELD_CLASS} min-h-20 resize-none py-2`}
            placeholder="Ej.: recibió el encargado, faltó una caja…"
            value={stop.note ?? ""}
            maxLength={500}
            onChange={(event) => onSetNote(stop.id, event.target.value)}
          />
        </div>
        <ChoferOrderPanel stop={stop} onUploadPhoto={(file) => onUploadPhoto(stop.id, file)} />
        <Button variant="success" big icon="check" onClick={() => onMarkDelivered(stop.id)}>
          Entregado
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" icon="undo" className="flex-1" onClick={() => setConfirmUndo(true)}>
            No he llegado
          </Button>
          <Button variant="secondary" icon="list" className="flex-1" onClick={onOpenList}>
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
              void onUndo(stop.id);
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
        <p className="text-xs font-bold uppercase tracking-wide text-soft">Siguiente tienda</p>
        <h2 className="truncate font-display text-3xl font-bold leading-tight">{stop.name}</h2>
        {legText && <p className="text-base font-semibold text-soft">{legText}</p>}
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
        className={buttonClass("primary", true)}
      >
        <Icon name="navigation" size={24} />
        Ir con Google Maps
      </a>
      <div className="flex gap-2">
        <Button variant="secondary" icon="map-pin" className="flex-1" onClick={() => onMarkArrived(stop.id)}>
          Ya llegué
        </Button>
        <Button variant="secondary" icon="list" className="flex-1" onClick={onOpenList}>
          Ver lista
        </Button>
      </div>
    </div>
  );
}
