"use client";

import { useId, useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { STATUS_LABEL } from "@/features/route/selectors";
import { useAppStore } from "@/lib/storage/store";
import type { Stop } from "@/types/domain";
import { DeleteStopButton } from "./DeleteStopButton";
import { ManualPickerStep } from "./ManualPickerStep";

const SOURCE_LABEL: Record<Stop["coordsSource"], string> = {
  "link-exact": "Ubicación tomada del link",
  "link-approx": "Ubicación aproximada (del link)",
  geocoded: "Ubicación aproximada (por dirección)",
  manual: "Ubicación elegida en el mapa",
};

interface StopDetailSheetProps {
  stop: Stop;
  onClose: () => void;
  /** Acciones de entrega (deshacer, entregar igual); las aporta la pantalla de ruta. */
  deliveryActions?: ReactNode;
}

export function StopDetailSheet({ stop, onClose, deliveryActions }: StopDetailSheetProps) {
  const updateStop = useAppStore((state) => state.updateStop);
  const [name, setName] = useState(stop.name);
  const [picking, setPicking] = useState(false);
  const nameId = useId();
  const nameChanged = name.trim() !== "" && name.trim() !== stop.name;

  if (picking) {
    return (
      <ManualPickerStep
        initialCenter={stop}
        onBack={() => setPicking(false)}
        onUse={(position) => {
          updateStop(stop.id, { location: { ...position, coordsSource: "manual" } });
          setPicking(false);
        }}
      />
    );
  }

  return (
    <Sheet title={stop.name} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-base">
          <span className="font-bold">{STATUS_LABEL[stop.status]}</span>
          <span className="text-ink-soft"> · {SOURCE_LABEL[stop.coordsSource]}</span>
        </p>
        {stop.note && <Banner>Observación: {stop.note}</Banner>}
        {deliveryActions}

        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className="font-semibold">
            Nombre
          </label>
          <input
            id={nameId}
            className="w-full rounded-xl border-2 border-ink bg-paper px-3 py-3 text-base"
            value={name}
            maxLength={80}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
          {nameChanged && (
            <Button className="mt-2" onClick={() => updateStop(stop.id, { name })}>
              Guardar nombre
            </Button>
          )}
        </div>

        <Button variant="secondary" onClick={() => setPicking(true)}>
          Cambiar ubicación
        </Button>
        <DeleteStopButton stop={stop} onDeleted={onClose} />
      </div>
    </Sheet>
  );
}
