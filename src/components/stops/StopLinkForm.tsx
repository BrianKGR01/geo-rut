"use client";

import { useId } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { FIELD_CLASS, TextField } from "@/components/ui/TextField";
import { useHasMounted } from "@/components/ui/useHasMounted";

interface StopLinkFormProps {
  name: string;
  text: string;
  busy: boolean;
  error?: string;
  onNameChange: (name: string) => void;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  onManual: () => void;
  onClose: () => void;
}

export function StopLinkForm(props: StopLinkFormProps) {
  const { name, text, busy, error, onNameChange, onTextChange, onSubmit, onManual, onClose } = props;
  const linkId = useId();
  const mounted = useHasMounted();
  const canPaste = mounted && typeof navigator.clipboard?.readText === "function";

  const paste = async () => {
    try {
      onTextChange(await navigator.clipboard.readText());
    } catch {
      // Permiso denegado: el usuario todavía puede pegar a mano en el cuadro.
    }
  };

  return (
    <Sheet
      title="Agregar tienda"
      onClose={onClose}
      footer={
        <>
          <Button big icon="map-pin" onClick={onSubmit} disabled={busy || text.trim() === ""}>
            {busy ? "Buscando…" : "Buscar ubicación"}
          </Button>
          <Button variant="secondary" icon="locate" onClick={onManual} disabled={busy}>
            No tengo link: elegir en el mapa
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-end justify-between gap-2">
            <label htmlFor={linkId} className="text-sm font-bold uppercase tracking-wide text-soft">
              Link de Google Maps
            </label>
            {canPaste && (
              <Button variant="secondary" icon="clipboard" onClick={paste} disabled={busy}>
                Pegar
              </Button>
            )}
          </div>
          <textarea
            id={linkId}
            className={`${FIELD_CLASS} min-h-28 resize-none`}
            placeholder="En Google Maps: Compartir → Copiar. Luego pégalo aquí."
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            disabled={busy}
          />
        </div>
        <TextField
          label="Nombre de la tienda"
          placeholder="Ej.: Bodega Ana"
          value={name}
          onChange={onNameChange}
          disabled={busy}
        />
        {error && (
          <Banner tone="danger" role="alert">
            {error}
          </Banner>
        )}
      </form>
    </Sheet>
  );
}
