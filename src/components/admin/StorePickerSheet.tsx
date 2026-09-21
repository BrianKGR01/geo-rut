"use client";

import { useMemo, useState } from "react";
import type { StoreRecord } from "@/features/stores/api";
import { CatalogStoreList } from "./store-picker/CatalogStoreList";
import { ImportCatalogStoresPanel } from "./store-picker/ImportCatalogStoresPanel";
import { NewCatalogStoreForm } from "./store-picker/NewCatalogStoreForm";

type View = "catalog" | "new" | "import";

interface StorePickerSheetProps {
  /** Catálogo completo (fotografía al abrir la pantalla); ver Fase 3 en docs/DECISIONS.md. */
  catalogStores: StoreRecord[];
  /** Tiendas que ya están en la ruta/staged: se ocultan de la pestaña "Catálogo". */
  excludeStoreIds: Set<string>;
  createdBy: string;
  onConfirm: (stores: StoreRecord[]) => void;
  onClose: () => void;
}

/**
 * Orquestador sin `<Sheet>` propio (cada vista renderiza la suya), igual que `AddStopSheet`:
 * elegir del catálogo, agregar una tienda nueva (link/mapa) o importar un lote de texto. Las tres
 * vías terminan guardando en el catálogo `stores`, nunca en `route_stops` directamente — eso lo
 * decide quien use este componente (crear ruta = staging local, detalle de ruta = alta inmediata).
 */
export function StorePickerSheet({ catalogStores, excludeStoreIds, createdBy, onConfirm, onClose }: StorePickerSheetProps) {
  const [view, setView] = useState<View>("catalog");
  const available = useMemo(
    () => catalogStores.filter((store) => !excludeStoreIds.has(store.id)),
    [catalogStores, excludeStoreIds],
  );

  if (view === "new") {
    return (
      <NewCatalogStoreForm
        createdBy={createdBy}
        onCreated={(store) => {
          onConfirm([store]);
          onClose();
        }}
        onCancel={() => setView("catalog")}
      />
    );
  }
  if (view === "import") {
    return (
      <ImportCatalogStoresPanel
        createdBy={createdBy}
        existing={catalogStores}
        onImported={(stores) => {
          onConfirm(stores);
          onClose();
        }}
        onBack={() => setView("catalog")}
      />
    );
  }
  return (
    <CatalogStoreList
      stores={available}
      onConfirm={(picked) => {
        onConfirm(picked);
        onClose();
      }}
      onNew={() => setView("new")}
      onImport={() => setView("import")}
      onClose={onClose}
    />
  );
}
