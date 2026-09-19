"use client";

import { useState } from "react";
import { PickerMap } from "@/components/map";
import { LocateButton } from "@/components/map/LocateButton";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { useGeoStore } from "@/features/route/geoStore";
import type { LatLng } from "@/types/domain";
import type { MapView } from "@/types/map";

interface NameField {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

interface ManualPickerStepProps {
  title?: string;
  initialView: MapView;
  /** true si `initialView` es una suposición (no una ubicación ya elegida): el GPS la corrige solo. */
  followFirstFix: boolean;
  notice?: string;
  /** El nombre se pide en la misma pantalla para no obligar a editar la tienda después. */
  nameField?: NameField;
  confirmLabel?: string;
  onUse: (position: LatLng) => void;
  onBack: () => void;
}

export function ManualPickerStep(props: ManualPickerStepProps) {
  const { title = "Elegir ubicación", initialView, followFirstFix, notice, nameField, onUse, onBack } = props;
  const { confirmLabel = "Usar esta ubicación" } = props;
  const user = useGeoStore((state) => state.position);
  // Solo lat/lng: el zoom de la vista no es parte de la ubicación elegida.
  const [center, setCenter] = useState<LatLng>({ lat: initialView.lat, lng: initialView.lng });
  const [locateRequest, setLocateRequest] = useState(0);

  return (
    <Sheet
      title={title}
      onClose={onBack}
      closeKind="back"
      flush
      footer={
        <>
          {notice && <Banner tone="warn">{notice}</Banner>}
          {nameField && (
            <TextField
              label={nameField.label}
              placeholder={nameField.placeholder}
              value={nameField.value}
              onChange={nameField.onChange}
            />
          )}
          <Button big icon="check" onClick={() => onUse(center)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <PickerMap
        initialView={initialView}
        followFirstFix={followFirstFix}
        user={user}
        locateRequest={locateRequest}
        onCenterChange={setCenter}
      />
      {/* Pin fijo al centro: la punta queda justo en el centro del mapa. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-[44px]"
      >
        <div className="pin-marker" />
      </div>
      <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl bg-chrome/90 px-3 py-2 text-center text-sm font-semibold text-on-chrome">
        Mueve el mapa hasta que el pin quede sobre el lugar
      </p>
      <LocateButton
        className="absolute bottom-8 right-3 z-10"
        onLocate={() => setLocateRequest((value) => value + 1)}
      />
    </Sheet>
  );
}
