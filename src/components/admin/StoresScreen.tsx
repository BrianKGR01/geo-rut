"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { FIELD_CLASS } from "@/components/ui/TextField";
import { deactivateStore, type StoreRecord } from "@/features/stores/api";
import { createClient } from "@/lib/supabase/client";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { StoreEditSheet } from "./StoreEditSheet";
import { NewCatalogStoreForm } from "./store-picker/NewCatalogStoreForm";

interface StoresScreenProps {
  stores: StoreRecord[];
  currentUserId: string;
}

/**
 * Catálogo de tiendas administrable de forma independiente: antes solo se podía ver/crear tiendas
 * DESDE el flujo de crear una ruta; acá se puede ver, buscar, editar (nombre, ubicación, fotos) y
 * dar de baja cualquier tienda sin pasar por eso (ver `docs/DECISIONS.md`).
 */
export function StoresScreen({ stores: initialStores, currentUserId }: StoresScreenProps) {
  const [stores, setStores] = useState(initialStores);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StoreRecord | null>(null);
  const [toDeactivate, setToDeactivate] = useState<StoreRecord | null>(null);
  const [error, setError] = useState<string>();

  const filtered = stores.filter((store) => store.name.toLowerCase().includes(query.trim().toLowerCase()));

  const upsert = (store: StoreRecord) => {
    setStores((prev) => {
      const exists = prev.some((existing) => existing.id === store.id);
      const next = exists ? prev.map((existing) => (existing.id === store.id ? store : existing)) : [...prev, store];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const confirmDeactivate = async () => {
    if (!toDeactivate) return;
    setError(undefined);
    try {
      await deactivateStore(createClient(), toDeactivate.id, currentUserId);
      setStores((prev) => prev.filter((store) => store.id !== toDeactivate.id));
    } catch {
      setError("No se pudo dar de baja. Intenta de nuevo.");
    } finally {
      setToDeactivate(null);
    }
  };

  if (creating) {
    return (
      <NewCatalogStoreForm
        createdBy={currentUserId}
        onCreated={(store) => {
          upsert(store);
          setCreating(false);
        }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <AdminSectionHeader
        title="Tiendas"
        backHref="/admin"
        action={
          <Button icon="plus" onClick={() => setCreating(true)}>
            Nueva
          </Button>
        }
      />
      <input
        className={FIELD_CLASS}
        placeholder="Buscar tienda…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Buscar tienda del catálogo"
      />
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
      {filtered.length === 0 && (
        <p className="text-sm text-soft">
          {stores.length === 0 ? "Todavía no hay tiendas en el catálogo." : "No encontré tiendas con ese nombre."}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {filtered.map((store) => (
          <li
            key={store.id}
            className="flex min-h-14 items-center justify-between gap-2 rounded-xl border-2 border-line bg-card px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate font-bold text-ink">{store.name}</span>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={() => setEditing(store)}
                aria-label={`Editar ${store.name}`}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-via active:bg-via-tint"
              >
                <Icon name="edit" size={20} />
              </button>
              <button
                type="button"
                onClick={() => setToDeactivate(store)}
                aria-label={`Dar de baja a ${store.name}`}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-danger active:bg-danger-tint"
              >
                <Icon name="trash" size={20} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editing && (
        <StoreEditSheet store={editing} currentUserId={currentUserId} onSaved={upsert} onClose={() => setEditing(null)} />
      )}
      {toDeactivate && (
        <ConfirmDialog
          title="Dar de baja tienda"
          message={`${toDeactivate.name} ya no va a aparecer para agregar a nuevas rutas.`}
          confirmLabel="Dar de baja"
          destructive
          onConfirm={confirmDeactivate}
          onCancel={() => setToDeactivate(null)}
        />
      )}
    </div>
  );
}
