"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppStore } from "@/lib/storage/store";
import type { Stop } from "@/types/domain";

interface DeleteStopButtonProps {
  stop: Stop;
  onDeleted: () => void;
}

/** Eliminar siempre confirma; una tienda ya entregada con la ruta activa pide una confirmación extra. */
export function DeleteStopButton({ stop, onDeleted }: DeleteStopButtonProps) {
  const removeStop = useAppStore((state) => state.removeStop);
  const routeActive = useAppStore((state) => state.route.status === "active");
  const [stage, setStage] = useState<"idle" | "confirm" | "confirm-delivered">("idle");
  const needsExtra = routeActive && stop.status === "delivered";

  const remove = () => {
    removeStop(stop.id);
    onDeleted();
  };

  return (
    <>
      <Button variant="danger" onClick={() => setStage("confirm")}>
        Eliminar tienda
      </Button>
      {stage === "confirm" && (
        <ConfirmDialog
          title={`¿Eliminar ${stop.name}?`}
          message="Se quitará de la ruta. No se puede deshacer."
          confirmLabel="Eliminar"
          destructive
          onCancel={() => setStage("idle")}
          onConfirm={() => (needsExtra ? setStage("confirm-delivered") : remove())}
        />
      )}
      {stage === "confirm-delivered" && (
        <ConfirmDialog
          title="Esta tienda ya fue entregada"
          message="Si la eliminas se pierde el registro de la entrega y su observación. ¿Seguro?"
          confirmLabel="Sí, eliminar entrega"
          destructive
          onCancel={() => setStage("idle")}
          onConfirm={remove}
        />
      )}
    </>
  );
}
