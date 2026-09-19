"use client";

import { useState } from "react";
import { isResolveLinkError } from "@/features/stops/resolveLinkContract";
import { requestResolveLink, resolveErrorMessage } from "@/features/stops/resolveLinkClient";
import { parseSharedText } from "@/lib/geo/parseMapsLink";
import { useAppStore } from "@/lib/storage/store";
import type { CoordsSource, LatLng } from "@/types/domain";
import { LocationConfirmStep } from "./LocationConfirmStep";
import { ManualPickerStep } from "./ManualPickerStep";
import { StopLinkForm } from "./StopLinkForm";

type Step =
  | { kind: "form" }
  | { kind: "confirm"; position: LatLng; source: CoordsSource }
  | { kind: "manual"; center: LatLng; notice?: string };

interface AddStopSheetProps {
  /** Centro del selector manual cuando todavía no hay una ubicación candidata. */
  pickerCenter: LatLng;
  onClose: () => void;
}

export function AddStopSheet({ pickerCenter, onClose }: AddStopSheetProps) {
  const addStop = useAppStore((state) => state.addStop);
  const stopCount = useAppStore((state) => state.stops.length);
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [name, setName] = useState("");
  // Mientras el usuario no escriba el nombre a mano, se sigue proponiendo el del texto pegado.
  const [nameTouched, setNameTouched] = useState(false);
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const handleTextChange = (value: string) => {
    setText(value);
    setError(undefined);
    if (!nameTouched) setName(parseSharedText(value).name);
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
      setStep({ kind: "manual", center: pickerCenter, notice: resolveErrorMessage("NO_COORDS") });
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
        onChange={(position) => setStep({ kind: "confirm", position, source: "manual" })}
        onConfirm={() => save(step.position, step.source)}
        onManual={() => setStep({ kind: "manual", center: step.position })}
        onBack={() => setStep({ kind: "form" })}
      />
    );
  }
  if (step.kind === "manual") {
    return (
      <ManualPickerStep
        initialCenter={step.center}
        notice={step.notice}
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
      onNameChange={(value) => {
        setName(value);
        setNameTouched(value.trim() !== "");
      }}
      onTextChange={handleTextChange}
      onSubmit={resolve}
      onManual={() => setStep({ kind: "manual", center: pickerCenter })}
      onClose={onClose}
    />
  );
}
