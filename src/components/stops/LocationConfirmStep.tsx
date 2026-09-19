"use client";

import { ConfirmPinMap } from "@/components/map";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import type { LatLng } from "@/types/domain";

interface LocationConfirmStepProps {
  name: string;
  position: LatLng;
  approximate: boolean;
  onNameChange: (name: string) => void;
  onChange: (position: LatLng) => void;
  onConfirm: () => void;
  onManual: () => void;
  onBack: () => void;
}

export function LocationConfirmStep(props: LocationConfirmStepProps) {
  const { name, position, approximate, onNameChange, onChange, onConfirm, onManual, onBack } = props;
  return (
    <Sheet
      title="Confirmar ubicación"
      onClose={onBack}
      closeKind="back"
      flush
      footer={
        <>
          {approximate && <Banner tone="warn">Ubicación aproximada, verifica el pin.</Banner>}
          <TextField label="Nombre de la tienda" placeholder="Ej.: Bodega Ana" value={name} onChange={onNameChange} />
          <Button big icon="check" onClick={onConfirm}>
            Guardar tienda
          </Button>
          <Button variant="secondary" icon="map-pin" onClick={onManual}>
            Elegir otro punto en el mapa
          </Button>
        </>
      }
    >
      <ConfirmPinMap position={position} onChange={onChange} />
      <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl bg-chrome/90 px-3 py-2 text-center text-sm font-semibold text-on-chrome">
        Arrastra el pin o toca el mapa para corregirlo
      </p>
    </Sheet>
  );
}
