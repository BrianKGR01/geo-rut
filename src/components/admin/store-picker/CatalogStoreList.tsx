"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { FIELD_CLASS } from "@/components/ui/TextField";
import type { StoreRecord } from "@/features/stores/api";

interface CatalogStoreListProps {
  stores: StoreRecord[];
  onConfirm: (picked: StoreRecord[]) => void;
  onNew: () => void;
  onImport: () => void;
  onClose: () => void;
}

/** Paso "del catálogo": buscar y marcar una o varias tiendas ya existentes para agregar a la ruta. */
export function CatalogStoreList({ stores, onConfirm, onNew, onImport, onClose }: CatalogStoreListProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = stores.filter((store) => store.name.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Sheet
      title="Agregar tiendas"
      onClose={onClose}
      footer={
        <>
          <Button big icon="check" onClick={() => onConfirm(stores.filter((store) => selected.has(store.id)))} disabled={selected.size === 0}>
            Agregar {selected.size > 0 ? selected.size : ""} tienda{selected.size === 1 ? "" : "s"}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" icon="plus" className="flex-1" onClick={onNew}>
              Nueva
            </Button>
            <Button variant="secondary" icon="transfer" className="flex-1" onClick={onImport}>
              Importar texto
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          className={FIELD_CLASS}
          placeholder="Buscar tienda…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar tienda del catálogo"
        />
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-soft">
            {stores.length === 0 ? "Todavía no hay tiendas en el catálogo." : "No encontré tiendas con ese nombre."}
          </p>
        )}
        <ul className="flex flex-col gap-2">
          {filtered.map((store) => {
            const isSelected = selected.has(store.id);
            return (
              <li key={store.id}>
                <button
                  type="button"
                  onClick={() => toggle(store.id)}
                  aria-pressed={isSelected}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-3 text-left ${
                    isSelected ? "border-via-solid bg-via-tint" : "border-line bg-card"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                      isSelected ? "border-via-solid bg-via-solid text-white" : "border-line"
                    }`}
                  >
                    {isSelected && <Icon name="check" size={16} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">{store.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
