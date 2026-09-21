"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import {
  getRouteStopImageUrls,
  PHOTO_LIMIT_MESSAGE,
  ROUTE_STOP_IMAGES_LIMIT,
  UPLOADED_BY_LABEL,
  uploadRouteStopImage,
  type RouteStopImage,
} from "@/features/routes/routeStopImages";
import { createClient } from "@/lib/supabase/client";

interface OrderImagesPanelProps {
  routeId: string;
  routeStopId: string;
  images: RouteStopImage[];
  currentUserId: string;
  onChange: (images: RouteStopImage[]) => void;
}

/**
 * Fotos del pedido (hasta 3), con quién subió cada una. El administrador solo puede subir desde
 * acá (borrar es borrado lógico, sin pantalla propia todavía); el chofer inserta con el mismo tope
 * desde su tarjeta de entrega (`ChoferOrderPanel`, Fase 5), usando el mismo `UPLOADED_BY_LABEL`.
 */
export function OrderImagesPanel({ routeId, routeStopId, images, currentUserId, onChange }: OrderImagesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const atLimit = images.length >= ROUTE_STOP_IMAGES_LIMIT;

  // Bucket privado: cada foto necesita su propia URL firmada (temporal) para poder mostrarse.
  // El estado inicial ({}) ya cubre el caso "sin fotos"; el efecto solo suma las que hacen falta.
  useEffect(() => {
    let active = true;
    const paths = images.map((image) => image.storagePath);
    if (paths.length === 0) return;
    getRouteStopImageUrls(createClient(), paths)
      .then((result) => {
        if (active) setUrls((prev) => ({ ...prev, ...result }));
      })
      .catch(() => {
        // Sin miniatura no es crítico: la fila igual muestra quién subió cada foto.
      });
    return () => {
      active = false;
    };
  }, [images]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      const created = await uploadRouteStopImage(createClient(), {
        routeId,
        routeStopId,
        file,
        uploadedBy: currentUserId,
        uploadedRole: "admin",
      });
      onChange([...images, created]);
    } catch (err) {
      setError(err instanceof Error && err.message === PHOTO_LIMIT_MESSAGE ? err.message : "No se pudo subir la foto. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-2 rounded-xl border-2 border-line bg-card p-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-soft">
        Fotos ({images.length}/{ROUTE_STOP_IMAGES_LIMIT})
      </h3>
      {images.length === 0 && <p className="text-sm text-soft">Todavía no hay fotos.</p>}
      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((image) => (
            <li key={image.id} className="flex flex-col gap-1">
              <div className="aspect-square overflow-hidden rounded-lg border-2 border-line bg-page">
                {urls[image.storagePath] && (
                  // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal (bucket privado), no apta para next/image
                  <img src={urls[image.storagePath]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <p className="text-center text-xs font-semibold text-soft">{UPLOADED_BY_LABEL[image.uploadedRole]}</p>
            </li>
          ))}
        </ul>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} aria-label="Elegir foto" />
      <Button variant="secondary" icon="plus" onClick={() => inputRef.current?.click()} disabled={busy || atLimit}>
        {busy ? "Subiendo…" : atLimit ? "Ya hay 3 fotos" : "Agregar foto"}
      </Button>
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
    </section>
  );
}
