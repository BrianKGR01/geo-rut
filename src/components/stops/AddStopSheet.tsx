"use client";

import { useState } from "react";
import { useGeoStore } from "@/features/route/geoStore";
import { usePickerView } from "@/features/route/usePickerView";
import { isResolveLinkError } from "@/features/stops/resolveLinkContract";
import { requestResolveLink, resolveErrorMessage } from "@/features/stops/resolveLinkClient";
import { parseSharedText } from "@/lib/geo/parseMapsLink";
import { useAppStore } from "@/lib/storage/store";
import type { CoordsSource, LatLng } from "@/types/domain";
import type { MapView } from "@/types/map";
import { LocationConfirmStep } from "./LocationConfirmStep";
import { ManualPickerStep } from "./ManualPickerStep";
import { StopLinkForm } from "./StopLinkForm";

type Step =
  | { kind: "form" }
  | { kind: "confirm"; position: LatLng; source: CoordsSource }
  | { kind: "manual"; view: MapView; guessed: boolean; notice?: string };

export function AddStopSheet({ onClose }: { onClose: () => void }) {
  const addStop = useAppStore((state) => state.addStop);
  const stopCount = useAppStore((state) => state.stops.length);
  const picker = usePickerView();
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [name, setName] = useState("");
  // Mientras el usuario no escriba el nombre a mano, se sigue proponiendo el del texto pegado.
  const [nameTouched, setNameTouched] = useState(false);
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const changeName = (value: string) => {
    setName(value);
    setNameTouched(value.trim() !== "");
  };

  const handleTextChange = (value: string) => {
    setText(value);
    setError(undefined);
    if (!nameTouched) setName(parseSharedText(value).name);
  };

  const openManual = (notice?: string) => {
    // Es un gesto del usuario: buen momento para pedir el GPS y abrir el mapa donde está parado.
    useGeoStore.getState().start();
    setStep({ kind: "manual", view: picker.view, guessed: picker.guessed, notice });
  };

  const save = (position: LatLng, source: CoordsSource) => {
    addStop({
      ...position,
      name: name.trim() || `Tienda ${stopCount + 1}`,
      coordsSource: source,
      sourceUrl,
    });
    onClose();
  };

  const resolve = async () => {
    const shared = parseSharedText(text);
    if (shared.coords) {
      setStep({ kind: "confirm", position: shared.coords, source: shared.coords.source });
      return;
    }
    if (!shared.url) {
      setError("No encontré un link en el texto. Pégalo de nuevo o elige la ubicación en el mapa.");
      return;
    }
    setBusy(true);
    setError(undefined);
    const result = await requestResolveLink(shared.url);
    setBusy(false);
    setSourceUrl(shared.url);
    if (name.trim() === "" && result.suggestedName) setName(result.suggestedName);
    if (!isResolveLinkError(result)) {
      setStep({ kind: "confirm", position: { lat: result.lat, lng: result.lng }, source: result.source });
    } else if (result.error === "NO_COORDS") {
      openManual(resolveErrorMessage("NO_COORDS"));
    } else {
      setError(resolveErrorMessage(result.error));
    }
  };

  if (step.kind === "confirm") {
    return (
      <LocationConfirmStep
        name={name}
        position={step.position}
        approximate={step.source === "link-approx" || step.source === "geocoded"}
        onNameChange={changeName}
        onChange={(position) => setStep({ kind: "confirm", position, source: "manual" })}
        onConfirm={() => save(step.position, step.source)}
        onManual={() => setStep({ kind: "manual", view: { ...step.position, zoom: 17 }, guessed: false })}
        onBack={() => setStep({ kind: "form" })}
      />
    );
  }
  if (step.kind === "manual") {
    return (
      <ManualPickerStep
        title="Ubicar tienda"
        initialView={step.view}
        followFirstFix={step.guessed}
        notice={step.notice}
        nameField={{
          label: "Nombre de la tienda",
          placeholder: `Tienda ${stopCount + 1}`,
          value: name,
          onChange: changeName,
        }}
        confirmLabel="Guardar tienda"
        onUse={(position) => save(position, "manual")}
        onBack={() => setStep({ kind: "form" })}
      />
    );
  }
  return (
    <StopLinkForm
      name={name}
      text={text}
      busy={busy}
      error={error}
      onNameChange={changeName}
      onTextChange={handleTextChange}
      onSubmit={resolve}
      onManual={() => openManual()}
      onClose={onClose}
    />
  );
}
