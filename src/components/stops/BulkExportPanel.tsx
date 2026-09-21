"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FIELD_CLASS } from "@/components/ui/TextField";
import { useHasMounted } from "@/components/ui/useHasMounted";
import { serializeStops } from "@/features/stops/bulkText";
import { useAppStore } from "@/lib/storage/store";

export function BulkExportPanel() {
  const stops = useAppStore((state) => state.stops);
  const stopOrder = useAppStore((state) => state.route.stopOrder);
  const mounted = useHasMounted();
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => serializeStops(stops, stopOrder), [stops, stopOrder]);
  const canShare = mounted && typeof navigator.share === "function";

  if (stops.length === 0) {
    return <p className="text-soft">No hay tiendas para exportar.</p>;
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Permiso denegado: el usuario puede copiar a mano desde el cuadro.
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tiendas.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    try {
      await navigator.share({ text });
    } catch {
      // El usuario canceló el diálogo nativo: no es un error.
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <textarea
        readOnly
        className={`${FIELD_CLASS} min-h-48 resize-none`}
        value={text}
        aria-label="Texto de las tiendas para exportar"
      />
      <div className="flex flex-col gap-2">
        <Button variant="secondary" icon="clipboard" onClick={copy}>
          {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button variant="secondary" onClick={download}>
          Descargar .txt
        </Button>
        {canShare && (
          <Button variant="secondary" onClick={share}>
            Compartir
          </Button>
        )}
      </div>
    </div>
  );
}
