"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import type { Admin } from "@/features/admins/api";
import { inviteAdminErrorSchema, inviteAdminRequestSchema, inviteAdminSuccessSchema } from "@/features/admins/inviteContract";

export interface AdminWithEmail extends Admin {
  email?: string;
}

interface InviteAdminSheetProps {
  onInvited: (admin: AdminWithEmail) => void;
  onClose: () => void;
}

/** Llama al endpoint de servidor (clave secreta): el cliente nunca invita directo. */
export function InviteAdminSheet({ onInvited, onClose }: InviteAdminSheetProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    const parsed = inviteAdminRequestSchema.safeParse({ email, displayName: displayName.trim() || undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/admins/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const failure = inviteAdminErrorSchema.safeParse(body);
        setError(failure.success ? failure.data.error : "No se pudo invitar. Intenta de nuevo.");
        setBusy(false);
        return;
      }
      const success = inviteAdminSuccessSchema.parse(body);
      onInvited({
        userId: success.userId,
        email: success.email,
        displayName: success.displayName ?? undefined,
        invitedBy: success.invitedBy,
        createdAt: success.createdAt,
      });
    } catch {
      setError("No hay conexión con el servidor. Intenta de nuevo.");
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Invitar administrador"
      onClose={onClose}
      footer={
        <Button big icon="check" onClick={submit} disabled={busy}>
          {busy ? "Invitando…" : "Invitar"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={setEmail}
          disabled={busy}
        />
        <TextField label="Nombre (opcional)" value={displayName} onChange={setDisplayName} disabled={busy} />
        {error && (
          <Banner tone="danger" role="alert">
            {error}
          </Banner>
        )}
      </div>
    </Sheet>
  );
}
