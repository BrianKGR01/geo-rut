"use client";

import { useState } from "react";
import { LocationConfirmStep } from "@/components/stops/LocationConfirmStep";
import { ManualPickerStep } from "@/components/stops/ManualPickerStep";
import { StopLinkForm } from "@/components/stops/StopLinkForm";
import { useGeoStore } from "@/features/route/geoStore";
import { usePickerView } from "@/features/route/usePickerView";
import { isResolveLinkError } from "@/features/stops/resolveLinkContract";
import { requestResolveLink, resolveErrorMessage } from "@/features/stops/resolveLinkClient";
import { createStore, type StoreRecord } from "@/features/stores/api";
import { parseSharedText } from "@/lib/geo/parseMapsLink";
import { createClient } from "@/lib/supabase/client";
import type { CoordsSource, LatLng } from "@/types/domain";
import type { MapView } from "@/types/map";

type Step =
  | { kind: "form" }
  | { kind: "confirm"; position: LatLng; source: CoordsSource }
  | { kind: "manual"; view: MapView; guessed: boolean; notice?: string };

interface NewCatalogStoreFormProps {
  createdBy: string;
  onCreated: (store: StoreRecord) => void;
  onCancel: () => void;
}

/**
 * Mismo flujo de `AddStopSheet` (pegar link → confirmar pin, o elegir en el mapa), pero el
 * resultado se guarda en el catálogo `stores` de Supabase en vez del store Zustand de v1.
 */
export function NewCatalogStoreForm({ createdBy, onCreated, onCancel }: NewCatalogStoreFormProps) {
  const picker = usePickerView();
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [name, setName] = useState("");
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
    useGeoStore.getState().start();
    setStep({ kind: "manual", view: picker.view, guessed: picker.guessed, notice });
  };

  const save = async (position: LatLng, source: CoordsSource) => {
    setBusy(true);
    try {
      const store = await createStore(
        createClient(),
        { ...position, name: name.trim(), coordsSource: source, sourceUrl },
        createdBy,
      );
      onCreated(store);
    } catch {
      setBusy(false);
      setStep({ kind: "form" });
      setError("No se pudo guardar la tienda. Intenta de nuevo.");
    }
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
        nameField={{ label: "Nombre de la tienda", placeholder: "Ej.: Bodega Ana", value: name, onChange: changeName }}
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
      onClose={onCancel}
    />
  );
}
