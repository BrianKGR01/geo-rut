"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { createClient } from "@/lib/supabase/client";

const passwordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

type SessionState = "checking" | "ready" | "missing";

/** Traduce los errores de Supabase Auth a mensajes accionables en español. */
function updateErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("fetch") || normalized.includes("network")) {
    return "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  }
  if (normalized.includes("password") && normalized.includes("least")) {
    return "La contraseña es muy corta.";
  }
  return "No se pudo guardar la contraseña. Intenta de nuevo en unos segundos.";
}

/**
 * Pantalla a la que llega un administrador recién invitado (o que pidió recuperar su
 * contraseña), después de que `/auth/confirm` canjeó el enlace por una sesión real. Sin esta
 * pantalla no hay forma de terminar de dar de alta a un administrador: el login solo sirve para
 * quien ya tiene una contraseña puesta.
 */
export default function AcceptInvitePage() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!active) return;
        const anonymous = data.user?.is_anonymous ?? true;
        setSessionState(data.user && !anonymous ? "ready" : "missing");
      });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const parsed = passwordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.");
      return;
    }

    setBusy(true);
    setError(undefined);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });

    setBusy(false);
    if (updateError) {
      setError(updateErrorMessage(updateError.message));
      return;
    }
    setDone(true);
  };

  return (
    <div className="app-shell flex flex-col">
      <header className="pt-safe shrink-0 bg-chrome text-on-chrome">
        <div className="flex h-14 items-center pl-4">
          <h1 className="font-display text-[26px] font-bold uppercase leading-none tracking-wide">
            Ruta<span className="text-signal">Tiendas</span>
          </h1>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 items-center justify-center p-4">
        {sessionState === "checking" && (
          <p className="text-soft" role="status">
            Verificando el enlace…
          </p>
        )}

        {sessionState === "missing" && (
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border-2 border-strong bg-card p-5 text-center">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">Enlace inválido</h2>
            <p className="text-sm text-soft">
              Este enlace ya venció o ya se usó. Pídele al administrador que te invite de nuevo, o si ya tienes
              contraseña, ingresa directamente.
            </p>
            <Link href="/admin/login" className="min-h-11 text-sm font-semibold text-via underline underline-offset-4">
              Ir al inicio de sesión
            </Link>
          </div>
        )}

        {sessionState === "ready" && done && (
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border-2 border-ok-solid bg-card p-5 text-center">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">Listo</h2>
            <p className="text-sm text-soft">Tu contraseña quedó guardada.</p>
            <Link href="/admin" className="min-h-11 text-sm font-semibold text-via underline underline-offset-4">
              Entrar al panel
            </Link>
          </div>
        )}

        {sessionState === "ready" && !done && (
          <form
            onSubmit={onSubmit}
            className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border-2 border-strong bg-card p-5"
          >
            <div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">
                Elige tu contraseña
              </h2>
              <p className="mt-1 text-sm text-soft">La vas a usar para entrar como administrador.</p>
            </div>
            <TextField
              label="Contraseña nueva"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              disabled={busy}
            />
            <TextField
              label="Repite la contraseña"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              disabled={busy}
            />
            {error && (
              <Banner tone="danger" role="alert">
                {error}
              </Banner>
            )}
            <Button type="submit" big disabled={busy}>
              {busy ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
