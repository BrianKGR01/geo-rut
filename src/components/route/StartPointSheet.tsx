"use client";

import { useState } from "react";
import { ManualPickerStep } from "@/components/stops/ManualPickerStep";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useGeoStore, waitForPosition } from "@/features/route/geoStore";
import { usePickerView } from "@/features/route/usePickerView";
import { useAppStore } from "@/lib/storage/store";

interface OptionProps {
  icon: IconName;
  title: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
}

function Option({ icon, title, detail, selected, onSelect }: OptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex min-h-20 w-full items-center gap-3 rounded-xl border-2 bg-card px-3 py-3 text-left active:bg-raised ${
        selected ? "border-strong shadow-[0_3px_0_0_var(--signal)]" : "border-line"
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-via-solid text-white">
        <Icon name={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold leading-tight">{title}</span>
        <span className="block text-sm text-soft">{detail}</span>
      </span>
      {selected && <Icon name="check" className="text-ok" />}
    </button>
  );
}

/** De dónde sale la ruta: donde esté el celular o un punto fijo que se recuerda entre rutas. */
export function StartPointSheet({ onClose }: { onClose: () => void }) {
  const settings = useAppStore((state) => state.settings);
  const setFixedStart = useAppStore((state) => state.setFixedStart);
  const setGpsStart = useAppStore((state) => state.setGpsStart);
  const picker = usePickerView();
  const [picking, setPicking] = useState(false);
  const [label, setLabel] = useState(settings.fixedStart?.label ?? "");
  const fixed = settings.fixedStart;

  const chooseMyLocation = async () => {
    // Gesto del usuario: si el permiso no estaba dado, el navegador lo pide aquí.
    useGeoStore.getState().start();
    setGpsStart(useGeoStore.getState().position);
    onClose();
    const position = await waitForPosition(10_000);
    if (position) useAppStore.getState().captureStartPoint(position);
  };

  if (picking) {
    return (
      <ManualPickerStep
        title="Punto de partida"
        initialView={fixed ? { lat: fixed.lat, lng: fixed.lng, zoom: 17 } : picker.view}
        followFirstFix={!fixed && picker.guessed}
        nameField={{ label: "Nombre del punto", placeholder: "Ej.: Depósito, Mi casa", value: label, onChange: setLabel }}
        confirmLabel="Salir desde aquí"
        onBack={() => setPicking(false)}
        onUse={(position) => {
          setFixedStart({ ...position, label: label.trim() || "Punto de partida" });
          onClose();
        }}
      />
    );
  }

  return (
    <Sheet title="Punto de partida" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-base text-soft">
          La ruta se ordena y se dibuja desde aquí. Se recuerda para las próximas rutas.
        </p>
        <Option
          icon="locate"
          title="Mi ubicación actual"
          detail="Sale de donde estés al optimizar o iniciar la ruta."
          selected={settings.startMode === "gps"}
          onSelect={chooseMyLocation}
        />
        {fixed && (
          <Option
            icon="home"
            title={fixed.label}
            detail="Punto fijo guardado."
            selected={settings.startMode === "fixed"}
            onSelect={() => {
              setFixedStart(fixed);
              onClose();
            }}
          />
        )}
        <Option
          icon="map-pin"
          title={fixed ? "Cambiar el punto fijo" : "Elegir un punto fijo en el mapa"}
          detail="Por ejemplo el depósito o tu casa."
          selected={false}
          onSelect={() => {
            useGeoStore.getState().start();
            setPicking(true);
          }}
        />
      </div>
    </Sheet>
  );
}
