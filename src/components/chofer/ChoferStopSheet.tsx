"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import type { ChoferStop } from "@/features/route/choferRouteMapping";
import { STATUS_LABEL } from "@/features/route/selectors";

interface ChoferStopSheetProps {
  stop: ChoferStop;
  someoneDelivering: boolean;
  onClose: () => void;
  onMarkArrived: (stopId: string) => Promise<boolean>;
  onUndo: (stopId: string) => Promise<boolean>;
}

/**
 * Detalle de una tienda desde "Ver lista": mismas acciones que `StopDeliveryActions` de v1
 * (entregar fuera de orden, deshacer), sin editar nombre/ubicación — eso es del catálogo, solo lo
 * toca el administrador.
 */
export function ChoferStopSheet({ stop, someoneDelivering, onClose, onMarkArrived, onUndo }: ChoferStopSheetProps) {
  const [confirmUndo, setConfirmUndo] = useState(false);

  return (
    <Sheet title={stop.name} onClose={onClose} closeKind="back">
      <div className="flex flex-col gap-4">
        <p className="text-base font-bold">{STATUS_LABEL[stop.status]}</p>
        {stop.note && <Banner>Observación: {stop.note}</Banner>}

        {stop.status === "pending" && (
          <Button
            icon="check"
            disabled={someoneDelivering}
            onClick={async () => {
              if (await onMarkArrived(stop.id)) onClose();
            }}
          >
            {someoneDelivering ? "Termina la entrega en curso primero" : "Entregar igual (ya estoy aquí)"}
          </Button>
        )}

        {stop.status !== "pending" && (
          <Button variant="secondary" icon="undo" onClick={() => setConfirmUndo(true)}>
            Volver a pendiente
          </Button>
        )}
        {confirmUndo && (
          <ConfirmDialog
            title="¿Volver a pendiente?"
            message={`${stop.name} dejará de figurar como "${STATUS_LABEL[stop.status]}".`}
            confirmLabel="Sí, volver a pendiente"
            onCancel={() => setConfirmUndo(false)}
            onConfirm={async () => {
              setConfirmUndo(false);
              if (await onUndo(stop.id)) onClose();
            }}
          />
        )}
      </div>
    </Sheet>
  );
}
