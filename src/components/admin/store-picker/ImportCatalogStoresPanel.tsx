"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { BulkPreviewList } from "@/components/stops/BulkPreviewList";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { FIELD_CLASS } from "@/components/ui/TextField";
import { useBackLayer } from "@/components/ui/useBackLayer";
import { useHasMounted } from "@/components/ui/useHasMounted";
import { importBulkText, type ImportBulkTextResult } from "@/features/stops/importStops";
import { requestResolveLink } from "@/features/stops/resolveLinkClient";
import { createStore, type StoreRecord } from "@/features/stores/api";
import { createClient } from "@/lib/supabase/client";
import type { LatLng } from "@/types/domain";

type Phase = "edit" | "reviewing" | "preview" | "creating";

const PLACEHOLDER = "Nombre de la tienda\nLink de Google Maps (o lat, lng)\n\nSiguiente tienda\n...";

interface ImportCatalogStoresPanelProps {
  createdBy: string;
  existing: LatLng[];
  onImported: (stores: StoreRecord[]) => void;
  onBack: () => void;
}

/** Mismo `importBulkText`/`BulkPreviewList` que el importador de v1; el resultado se guarda en `stores`. */
export function ImportCatalogStoresPanel({ createdBy, existing, onImported, onBack }: ImportCatalogStoresPanelProps) {
  const mounted = useHasMounted();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdRef = useRef<StoreRecord[]>([]);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("edit");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportBulkTextResult>();
  const [creatingError, setCreatingError] = useState<string>();

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
    const outcome = await importBulkText(text, existing, {
      resolveLink: requestResolveLink,
      onProgress: (done, total) => setProgress({ done, total }),
    });
    setResult(outcome);
    setPhase("preview");
  };

  // Crea las tiendas UNA POR UNA (nunca en paralelo, mismo motivo que `importBulkText`: no
  // saturar Nominatim/la base). Si una falla, lo ya guardado NO se pierde: queda en `createdRef`
  // para que el admin decida seguir con esas o reintentar el resto más tarde.
  const importNow = async () => {
    if (!result) return;
    const okItems = result.items.filter((item) => item.status === "ok");
    createdRef.current = [];
    setPhase("creating");
    setCreatingError(undefined);
    setProgress({ done: 0, total: okItems.length });
    const supabase = createClient();
    for (const item of okItems) {
      try {
        const store = await createStore(
          supabase,
          { name: item.name, lat: item.lat, lng: item.lng, coordsSource: item.coordsSource, sourceUrl: item.sourceUrl },
          createdBy,
        );
        createdRef.current = [...createdRef.current, store];
        setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      } catch {
        setCreatingError(`Se guardaron ${createdRef.current.length} de ${okItems.length} tiendas. Revisa tu conexión.`);
        return;
      }
    }
    onImported(createdRef.current);
  };

  if (phase === "reviewing" || phase === "creating") {
    return (
      <Sheet title="Importar tiendas" onClose={onBack} closeKind="back">
        <div className="flex flex-col gap-3">
          <p className="py-6 text-center font-semibold text-soft" role="status">
            {phase === "reviewing" ? "Revisando" : "Guardando"} {progress.done} de {progress.total || "…"}
          </p>
          {creatingError && (
            <>
              <Banner tone="danger" role="alert">
                {creatingError}
              </Banner>
              <Button onClick={() => onImported(createdRef.current)}>Continuar con {progress.done} guardadas</Button>
            </>
          )}
        </div>
      </Sheet>
    );
  }

  if (phase === "preview" && result) {
    return <ImportPreview result={result} onImport={importNow} onBack={() => setPhase("edit")} onClose={onBack} />;
  }

  return (
    <Sheet title="Importar tiendas" onClose={onBack} closeKind="back">
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
          <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleFile} />
        </div>
        <Button icon="list" onClick={review} disabled={text.trim() === ""}>
          Revisar
        </Button>
      </div>
    </Sheet>
  );
}

interface ImportPreviewProps {
  result: ImportBulkTextResult;
  onImport: () => void;
  onBack: () => void;
  onClose: () => void;
}

function ImportPreview({ result, onImport, onBack, onClose }: ImportPreviewProps) {
  useBackLayer(onBack);
  const okCount = result.items.filter((item) => item.status === "ok").length;
  const duplicateCount = result.items.filter((item) => item.status === "duplicate").length;
  const errorCount = result.items.filter((item) => item.status === "error").length;
  return (
    <Sheet title="Importar tiendas" onClose={onClose} closeKind="back">
      <div className="flex flex-col gap-3">
        {result.truncated && (
          <Banner tone="warn">Se revisaron las primeras 100 tiendas; el resto del texto se ignoró.</Banner>
        )}
        <p className="text-sm font-semibold text-soft">
          {okCount} para importar
          {duplicateCount > 0
            ? `, ${duplicateCount} duplicada${duplicateCount === 1 ? "" : "s"} omitida${duplicateCount === 1 ? "" : "s"}`
            : ""}
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
    </Sheet>
  );
}
