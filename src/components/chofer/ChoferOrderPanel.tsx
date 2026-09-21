"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import type { ChoferStop } from "@/features/route/choferRouteMapping";
import { getRouteStopImageUrls, PHOTO_LIMIT_MESSAGE, ROUTE_STOP_IMAGES_LIMIT, UPLOADED_BY_LABEL } from "@/features/routes/routeStopImages";
import { formatMonto } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

interface ChoferOrderPanelProps {
  stop: ChoferStop;
  onUploadPhoto: (file: File) => Promise<{ ok: true } | { ok: false; message: string }>;
}

/**
 * Pedido de la tienda (monto/partidas/fotos), visible solo con la tienda en "Entregando" (la
 * pantalla que la muestra ya se encarga de eso). El chofer puede AGREGAR fotos, nunca borrar ni
 * editar monto/partidas (eso es del administrador, `OrderSheet`).
 */
export function ChoferOrderPanel({ stop, onUploadPhoto }: ChoferOrderPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const atLimit = stop.images.length >= ROUTE_STOP_IMAGES_LIMIT;

  useEffect(() => {
    let active = true;
    const paths = stop.images.map((image) => image.storagePath);
    if (paths.length === 0) return;
    getRouteStopImageUrls(createClient(), paths)
      .then((result) => active && setUrls((prev) => ({ ...prev, ...result })))
      .catch(() => {
        // Sin miniatura no es crítico: la fila igual muestra quién subió cada foto.
      });
    return () => {
      active = false;
    };
  }, [stop.images]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(undefined);
    const result = await onUploadPhoto(file);
    if (!result.ok) setError(result.message === PHOTO_LIMIT_MESSAGE ? result.message : "No se pudo subir la foto. Intenta de nuevo.");
    setBusy(false);
  };

  return (
    <section className="flex flex-col gap-2 rounded-xl border-2 border-line bg-card p-3" aria-label="Pedido de esta tienda">
      <h3 className="text-sm font-bold uppercase tracking-wide text-soft">Pedido</h3>
      {stop.pedidoMonto !== null && <p className="text-lg font-bold">{formatMonto(stop.pedidoMonto)}</p>}
      {stop.items.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-sm">
          {stop.items.map((item) => (
            <li key={item.id}>
              • {item.description}
              {item.quantity !== null && <span className="text-soft"> · {item.quantity}</span>}
            </li>
          ))}
        </ul>
      )}
      {stop.pedidoMonto === null && stop.items.length === 0 && (
        <p className="text-sm text-soft">Sin monto ni partidas cargadas.</p>
      )}
      {stop.images.length === 0 && <p className="text-sm text-soft">Todavía no hay fotos.</p>}
      {stop.images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {stop.images.map((image) => (
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
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} aria-label="Agregar foto del pedido" />
      <Button variant="secondary" icon="plus" onClick={() => inputRef.current?.click()} disabled={busy || atLimit}>
        {busy ? "Subiendo…" : atLimit ? "Ya hay 3 fotos" : `Agregar foto (${stop.images.length}/${ROUTE_STOP_IMAGES_LIMIT})`}
      </Button>
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
    </section>
  );
}
