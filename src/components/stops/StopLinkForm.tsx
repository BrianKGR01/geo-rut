"use client";

import { useId } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
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

const FIELD =
  "w-full rounded-xl border-2 border-ink bg-paper px-3 py-3 text-base placeholder:text-ink-soft";

export function StopLinkForm(props: StopLinkFormProps) {
  const { name, text, busy, error, onNameChange, onTextChange, onSubmit, onManual, onClose } = props;
  const nameId = useId();
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
          <Button big onClick={onSubmit} disabled={busy || text.trim() === ""}>
            {busy ? "Buscando ubicación…" : "Buscar ubicación"}
          </Button>
          <Button variant="secondary" onClick={onManual} disabled={busy}>
            Elegir en el mapa
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
          <div className="flex items-end justify-between">
            <label htmlFor={linkId} className="font-semibold">
              Link de Google Maps
            </label>
            {canPaste && (
              <Button variant="secondary" onClick={paste} disabled={busy}>
                Pegar
              </Button>
            )}
          </div>
          <textarea
            id={linkId}
            className={`${FIELD} min-h-28 resize-none`}
            placeholder="Pega aquí lo que compartiste desde Google Maps"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className="font-semibold">
            Nombre
          </label>
          <input
            id={nameId}
            className={FIELD}
            placeholder="Ej.: Bodega Ana"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            maxLength={80}
            autoComplete="off"
            disabled={busy}
          />
        </div>
        {error && (
          <Banner tone="danger" role="alert">
            {error}
          </Banner>
        )}
      </form>
    </Sheet>
  );
}
