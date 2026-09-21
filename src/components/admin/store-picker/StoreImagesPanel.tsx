"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import {
  getStoreImageUrls,
  removeStoreImage,
  STORE_IMAGES_LIMIT,
  STORE_PHOTO_LIMIT_MESSAGE,
  uploadStoreImage,
  type StoreImage,
} from "@/features/stores/storeImages";
import { createClient } from "@/lib/supabase/client";

interface StoreImagesPanelProps {
  storeId: string;
  images: StoreImage[];
  currentUserId: string;
  onChange: (images: StoreImage[]) => void;
}

/**
 * Fotos de referencia de una tienda del catálogo (hasta 3): subir y borrar, siempre como
 * administrador (a diferencia de `OrderImagesPanel`, acá no hay "quién subió" que mostrar y sí
 * hay borrado, porque el catálogo es admin-only de punta a punta).
 */
export function StoreImagesPanel({ storeId, images, currentUserId, onChange }: StoreImagesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [toDelete, setToDelete] = useState<StoreImage | null>(null);
  const atLimit = images.length >= STORE_IMAGES_LIMIT;

  // Bucket privado: cada foto necesita su propia URL firmada (temporal) para poder mostrarse.
  useEffect(() => {
    let active = true;
    const paths = images.map((image) => image.storagePath);
    if (paths.length === 0) return;
    getStoreImageUrls(createClient(), paths)
      .then((result) => {
        if (active) setUrls((prev) => ({ ...prev, ...result }));
      })
      .catch(() => {
        // Sin miniatura no es crítico: se puede reintentar más tarde.
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
      const created = await uploadStoreImage(createClient(), { storeId, file, uploadedBy: currentUserId });
      onChange([...images, created]);
    } catch (err) {
      setError(
        err instanceof Error && err.message === STORE_PHOTO_LIMIT_MESSAGE
          ? err.message
          : "No se pudo subir la foto. Intenta de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setError(undefined);
    try {
      await removeStoreImage(createClient(), toDelete.id, currentUserId);
      onChange(images.filter((image) => image.id !== toDelete.id));
    } catch {
      setError("No se pudo borrar la foto. Intenta de nuevo.");
    } finally {
      setToDelete(null);
    }
  };

  return (
    <section className="flex flex-col gap-2 rounded-xl border-2 border-line bg-card p-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-soft">
        Fotos ({images.length}/{STORE_IMAGES_LIMIT})
      </h3>
      {images.length === 0 && <p className="text-sm text-soft">Todavía no hay fotos.</p>}
      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((image) => (
            <li key={image.id} className="relative aspect-square overflow-hidden rounded-lg border-2 border-line bg-page">
              {urls[image.storagePath] && (
                // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal (bucket privado), no apta para next/image
                <img src={urls[image.storagePath]} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => setToDelete(image)}
                aria-label="Borrar foto"
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-bl-xl bg-black/60 text-white active:bg-black/80"
              >
                <Icon name="trash" size={18} />
              </button>
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
      {toDelete && (
        <ConfirmDialog
          title="Borrar foto"
          message="La foto deja de mostrarse en la tienda."
          confirmLabel="Borrar"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </section>
  );
}
