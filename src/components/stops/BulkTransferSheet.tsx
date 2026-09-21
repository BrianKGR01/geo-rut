"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { BulkExportPanel } from "./BulkExportPanel";
import { BulkImportPanel } from "./BulkImportPanel";

type Tab = "import" | "export";

function tabClass(active: boolean): string {
  return `min-h-12 flex-1 rounded-xl border-2 font-display font-bold uppercase tracking-wide ${
    active ? "border-strong bg-card text-ink" : "border-line bg-transparent text-soft"
  }`;
}

interface BulkTransferSheetProps {
  onClose: () => void;
}

/** Hoja "Importar / exportar tiendas": junta el pegado de texto y la exportación en un solo lugar. */
export function BulkTransferSheet({ onClose }: BulkTransferSheetProps) {
  const [tab, setTab] = useState<Tab>("import");

  return (
    <Sheet title="Importar / exportar tiendas" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button type="button" aria-pressed={tab === "import"} onClick={() => setTab("import")} className={tabClass(tab === "import")}>
            Importar
          </button>
          <button type="button" aria-pressed={tab === "export"} onClick={() => setTab("export")} className={tabClass(tab === "export")}>
            Exportar
          </button>
        </div>
        {/* Los dos paneles quedan montados siempre: alternar de pestaña solo los oculta, así no
            se pierde el texto pegado ni el avance de la revisión al ir y volver. */}
        <div className={tab === "import" ? undefined : "hidden"}>
          <BulkImportPanel onImported={onClose} />
        </div>
        <div className={tab === "export" ? undefined : "hidden"}>
          <BulkExportPanel />
        </div>
      </div>
    </Sheet>
  );
}
