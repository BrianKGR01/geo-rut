"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { FIELD_CLASS } from "@/components/ui/TextField";
import { DRIVER_CODE_LENGTH } from "@/features/routes/driverCode";
import { claimRouteByCode } from "@/features/route/supabaseSession";
import { createClient } from "@/lib/supabase/client";

interface ClaimCodeScreenProps {
  onClaimed: (routeId: string) => void;
}

/** Pantalla "Ingresar código de ruta": lo primero que ve un chofer sin ruta canjeada todavía. */
export function ClaimCodeScreen({ onClaimed }: ClaimCodeScreenProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    if (code.trim().length === 0) {
      setError("Escribe el código de 6 caracteres que te dio el administrador.");
      return;
    }
    setBusy(true);
    setError(undefined);
    const result = await claimRouteByCode(createClient(), code);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClaimed(result.routeId);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      <div>
        <p className="font-display text-3xl font-bold uppercase tracking-wide">Ingresar código de ruta</p>
        <p className="mt-1 text-soft">Pídeselo al administrador. Son {DRIVER_CODE_LENGTH} letras y números.</p>
      </div>
      <input
        className={`${FIELD_CLASS} w-full max-w-xs text-center font-display text-3xl font-bold uppercase tracking-[0.3em]`}
        value={code}
        onChange={(event) => {
          setCode(event.target.value.toUpperCase());
          setError(undefined);
        }}
        maxLength={DRIVER_CODE_LENGTH}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="go"
        placeholder={"·".repeat(DRIVER_CODE_LENGTH)}
        aria-label="Código de ruta"
        onKeyDown={(event) => event.key === "Enter" && void submit()}
        disabled={busy}
      />
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
      <Button big className="w-full max-w-xs" onClick={submit} disabled={busy}>
        {busy ? "Verificando…" : "Ingresar"}
      </Button>
    </div>
  );
}
