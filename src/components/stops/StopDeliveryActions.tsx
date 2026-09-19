"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppStore } from "@/lib/storage/store";
import type { Stop } from "@/types/domain";

interface StopDeliveryActionsProps {
  stop: Stop;
  onDone: () => void;
}

/** Acciones de entrega desde el detalle: entregar fuera de orden y deshacer. */
export function StopDeliveryActions({ stop, onDone }: StopDeliveryActionsProps) {
  const routeStatus = useAppStore((state) => state.route.status);
  const someoneDelivering = useAppStore((state) => state.stops.some((item) => item.status === "delivering"));
  const markArrived = useAppStore((state) => state.markArrived);
  const undoStop = useAppStore((state) => state.undoStop);
  const [confirmUndo, setConfirmUndo] = useState(false);

  if (stop.status === "pending") {
    if (routeStatus !== "active") return null;
    return (
      <Button
        disabled={someoneDelivering}
        onClick={() => {
          if (markArrived(stop.id)) onDone();
        }}
      >
        {someoneDelivering ? "Termina la entrega en curso primero" : "Entregar igual (ya estoy aquí)"}
      </Button>
    );
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setConfirmUndo(true)}>
        Volver a pendiente
      </Button>
      {confirmUndo && (
        <ConfirmDialog
          title="¿Volver a pendiente?"
          message={`${stop.name} dejará de figurar como “${stop.status === "delivered" ? "Entregado" : "Entregando"}”.`}
          confirmLabel="Sí, volver a pendiente"
          onCancel={() => setConfirmUndo(false)}
          onConfirm={() => {
            undoStop(stop.id);
            setConfirmUndo(false);
            onDone();
          }}
        />
      )}
    </>
  );
}
