"use client";

import { useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
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
  const nameChanged = name.trim() !== "" && name.trim() !== stop.name;

  if (picking) {
    return (
      <ManualPickerStep
        title="Mover tienda"
        initialView={{ lat: stop.lat, lng: stop.lng, zoom: 17 }}
        followFirstFix={false}
        confirmLabel="Guardar ubicación"
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
          <span className="text-soft"> · {SOURCE_LABEL[stop.coordsSource]}</span>
        </p>
        {stop.note && <Banner>Observación: {stop.note}</Banner>}
        {deliveryActions}

        <section className="flex flex-col gap-3 rounded-xl border-2 border-line bg-card p-3">
          <TextField label="Nombre de la tienda" value={name} onChange={setName} />
          {nameChanged && (
            <Button icon="check" onClick={() => updateStop(stop.id, { name })}>
              Guardar nombre
            </Button>
          )}
          <Button variant="secondary" icon="map-pin" onClick={() => setPicking(true)}>
            Cambiar ubicación
          </Button>
        </section>
        <DeleteStopButton stop={stop} onDeleted={onClose} />
      </div>
    </Sheet>
  );
}
