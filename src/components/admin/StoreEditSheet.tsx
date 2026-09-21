"use client";

import { useEffect, useState } from "react";
import { ManualPickerStep } from "@/components/stops/ManualPickerStep";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { updateStore, type StoreRecord } from "@/features/stores/api";
import { listStoreImages, type StoreImage } from "@/features/stores/storeImages";
import { createClient } from "@/lib/supabase/client";
import type { LatLng } from "@/types/domain";
import { StoreImagesPanel } from "./store-picker/StoreImagesPanel";

interface StoreEditSheetProps {
  store: StoreRecord;
  currentUserId: string;
  /** Se llama con la fila actualizada cada vez que se guarda algo, sin cerrar la hoja. */
  onSaved: (store: StoreRecord) => void;
  onClose: () => void;
}

/**
 * Editar una tienda del catálogo sin pasar por crear una ruta: nombre, ubicación (mismo picker de
 * mapa que "Cambiar ubicación" en `StopDetailSheet`, v1) y sus fotos de referencia. No se cierra
 * sola al guardar nombre/ubicación porque el administrador suele encadenar varias correcciones
 * (nombre, luego mover el pin, luego una foto) en la misma visita.
 */
export function StoreEditSheet({ store, currentUserId, onSaved, onClose }: StoreEditSheetProps) {
  const [current, setCurrent] = useState(store);
  const [name, setName] = useState(store.name);
  const [picking, setPicking] = useState(false);
  const [images, setImages] = useState<StoreImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const nameChanged = name.trim() !== "" && name.trim() !== current.name;

  useEffect(() => {
    let active = true;
    listStoreImages(createClient(), store.id)
      .then((result) => {
        if (active) setImages(result);
      })
      .catch(() => {
        // Sin fotos cargadas no bloquea editar nombre/ubicación.
      });
    return () => {
      active = false;
    };
  }, [store.id]);

  const saveName = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const saved = await updateStore(createClient(), current.id, { name: name.trim() });
      setCurrent(saved);
      setName(saved.name);
      onSaved(saved);
    } catch {
      setError("No se pudo guardar el nombre. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const saveLocation = async (position: LatLng) => {
    setPicking(false);
    setBusy(true);
    setError(undefined);
    try {
      const saved = await updateStore(createClient(), current.id, { ...position, coordsSource: "manual" });
      setCurrent(saved);
      onSaved(saved);
    } catch {
      setError("No se pudo guardar la ubicación. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  if (picking) {
    return (
      <ManualPickerStep
        title="Cambiar ubicación"
        initialView={{ lat: current.lat, lng: current.lng, zoom: 17 }}
        followFirstFix={false}
        confirmLabel="Guardar ubicación"
        onBack={() => setPicking(false)}
        onUse={saveLocation}
      />
    );
  }

  return (
    <Sheet title="Editar tienda" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {error && (
          <Banner tone="danger" role="alert">
            {error}
          </Banner>
        )}
        <section className="flex flex-col gap-3 rounded-xl border-2 border-line bg-card p-3">
          <TextField label="Nombre de la tienda" value={name} onChange={setName} disabled={busy} />
          {nameChanged && (
            <Button icon="check" onClick={saveName} disabled={busy}>
              {busy ? "Guardando…" : "Guardar nombre"}
            </Button>
          )}
          <Button variant="secondary" icon="map-pin" onClick={() => setPicking(true)} disabled={busy}>
            Cambiar ubicación
          </Button>
        </section>
        <StoreImagesPanel storeId={current.id} images={images} currentUserId={currentUserId} onChange={setImages} />
      </div>
    </Sheet>
  );
}
