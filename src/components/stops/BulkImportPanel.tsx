"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { FIELD_CLASS } from "@/components/ui/TextField";
import { useBackLayer } from "@/components/ui/useBackLayer";
import { useHasMounted } from "@/components/ui/useHasMounted";
import { importBulkText, type ImportBulkTextResult } from "@/features/stops/importStops";
import { requestResolveLink } from "@/features/stops/resolveLinkClient";
import { useAppStore } from "@/lib/storage/store";
import { BulkPreviewList } from "./BulkPreviewList";

type Phase = "edit" | "reviewing" | "preview";

const PLACEHOLDER = "Nombre de la tienda\nLink de Google Maps (o lat, lng)\n\nSiguiente tienda\n...";

interface BulkImportPanelProps {
  onImported: () => void;
}

export function BulkImportPanel({ onImported }: BulkImportPanelProps) {
  const stops = useAppStore((state) => state.stops);
  const addStops = useAppStore((state) => state.addStops);
  const mounted = useHasMounted();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("edit");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportBulkTextResult>();

  const canPaste = mounted && typeof navigator.clipboard?.readText === "function";

  const paste = async () => {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      // Permiso denegado: el usuario todavía puede pegar a mano en el cuadro.
    }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setText(reader.result);
    };
    reader.readAsText(file);
  };

  const review = async () => {
    setPhase("reviewing");
    setProgress({ done: 0, total: 0 });
    const existingPoints = stops.map(({ lat, lng }) => ({ lat, lng }));
    const outcome = await importBulkText(text, existingPoints, {
      resolveLink: requestResolveLink,
      onProgress: (done, total) => setProgress({ done, total }),
    });
    setResult(outcome);
    setPhase("preview");
  };

  const importNow = () => {
    if (!result) return;
    const okItems = result.items.filter((item) => item.status === "ok");
    addStops(
      okItems.map((item) => ({
        lat: item.lat,
        lng: item.lng,
        name: item.name,
        coordsSource: item.coordsSource,
        sourceUrl: item.sourceUrl,
      })),
    );
    onImported();
  };

  if (phase === "reviewing") {
    return (
      <p className="py-6 text-center font-semibold text-soft" role="status">
        Revisando {progress.done} de {progress.total || "…"}
      </p>
    );
  }

  if (phase === "preview" && result) {
    return <BulkImportPreview result={result} onImport={importNow} onBack={() => setPhase("edit")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        className={`${FIELD_CLASS} min-h-48 resize-none`}
        placeholder={PLACEHOLDER}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Texto con las tiendas a importar"
      />
      <div className="flex gap-2">
        {canPaste && (
          <Button variant="secondary" icon="clipboard" className="flex-1" onClick={paste}>
            Pegar
          </Button>
        )}
        <Button variant="secondary" className="flex-1" onClick={() => fileInputRef.current?.click()}>
          Elegir archivo .txt
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      <Button icon="list" onClick={review} disabled={text.trim() === ""}>
        Revisar
      </Button>
    </div>
  );
}

interface BulkImportPreviewProps {
  result: ImportBulkTextResult;
  onImport: () => void;
  onBack: () => void;
}

/**
 * Fase de vista previa: registra su propia capa de historial (como los pasos de AddStopSheet)
 * para que el botón/gesto "atrás" del celular vuelva al cuadro de texto en vez de cerrar toda
 * la hoja de importar/exportar.
 */
function BulkImportPreview({ result, onImport, onBack }: BulkImportPreviewProps) {
  useBackLayer(onBack);
  const okCount = result.items.filter((item) => item.status === "ok").length;
  const duplicateCount = result.items.filter((item) => item.status === "duplicate").length;
  const errorCount = result.items.filter((item) => item.status === "error").length;
  return (
    <div className="flex flex-col gap-3">
      {result.truncated && (
        <Banner tone="warn">Se revisaron las primeras 100 tiendas; el resto del texto se ignoró.</Banner>
      )}
      <p className="text-sm font-semibold text-soft">
        {okCount} para importar
        {duplicateCount > 0 ? `, ${duplicateCount} duplicada${duplicateCount === 1 ? "" : "s"} omitida${duplicateCount === 1 ? "" : "s"}` : ""}
        {errorCount > 0 ? `, ${errorCount} con error` : ""}.
      </p>
      <BulkPreviewList items={result.items} />
      <div className="flex flex-col gap-2 pt-2">
        <Button icon="plus" onClick={onImport} disabled={okCount === 0}>
          Importar {okCount} tienda{okCount === 1 ? "" : "s"}
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Volver a editar
        </Button>
      </div>
    </div>
  );
}
