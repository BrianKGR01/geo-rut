"use client";

import { ConfirmPinMap } from "@/components/map";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { LatLng } from "@/types/domain";

interface LocationConfirmStepProps {
  name: string;
  position: LatLng;
  approximate: boolean;
  onChange: (position: LatLng) => void;
  onConfirm: () => void;
  onManual: () => void;
  onBack: () => void;
}

export function LocationConfirmStep(props: LocationConfirmStepProps) {
  const { name, position, approximate, onChange, onConfirm, onManual, onBack } = props;
  return (
    <Sheet
      title={name || "Confirmar ubicación"}
      onClose={onBack}
      closeLabel="Atrás"
      flush
      footer={
        <>
          {approximate && <Banner tone="warn">Ubicación aproximada, verifica el pin.</Banner>}
          <p className="text-sm text-ink-soft">Arrastra el pin o toca el mapa para corregirlo.</p>
          <Button big onClick={onConfirm}>
            Confirmar ubicación
          </Button>
          <Button variant="secondary" onClick={onManual}>
            Elegir manualmente
          </Button>
        </>
      }
    >
      <ConfirmPinMap position={position} onChange={onChange} />
    </Sheet>
  );
}
