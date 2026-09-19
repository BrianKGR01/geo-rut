"use client";

import { useState } from "react";
import { PickerMap } from "@/components/map";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { LatLng } from "@/types/domain";

interface ManualPickerStepProps {
  initialCenter: LatLng;
  notice?: string;
  onUse: (position: LatLng) => void;
  onBack: () => void;
}

export function ManualPickerStep({ initialCenter, notice, onUse, onBack }: ManualPickerStepProps) {
  const [center, setCenter] = useState(initialCenter);
  return (
    <Sheet
      title="Elegir ubicación"
      onClose={onBack}
      closeLabel="Atrás"
      flush
      footer={
        <>
          {notice && <Banner tone="warn">{notice}</Banner>}
          <p className="text-sm text-ink-soft">Mueve el mapa hasta que el pin quede sobre la tienda.</p>
          <Button big onClick={() => onUse(center)}>
            Usar esta ubicación
          </Button>
        </>
      }
    >
      <PickerMap initialCenter={initialCenter} onCenterChange={setCenter} />
      {/* Pin fijo al centro: la punta queda justo en el centro del mapa. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[44px]"
      >
        <div className="pin-marker relative" />
      </div>
    </Sheet>
  );
}
