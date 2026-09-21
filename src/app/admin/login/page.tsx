"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useHasMounted } from "@/components/ui/useHasMounted";
import { createClient } from "@/lib/supabase/client";

const credentialsSchema = z.object({
  email: z.string().trim().min(1, "Escribe tu email.").email("Ese email no es válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

/** Traduce los errores de Supabase Auth a mensajes accionables en español. */
function loginErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "El email o la contraseña no son correctos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Todavía no confirmaste tu email. Revisa tu correo (o la carpeta de spam) y sigue el enlace.";
  }
  if (normalized.includes("fetch") || normalized.includes("network")) {
    return "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  }
  return "No se pudo iniciar sesión. Intenta de nuevo en unos segundos.";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const mounted = useHasMounted();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // Llega acá si /auth/confirm no pudo canjear un enlace de invitación/recuperación (vencido o
  // ya usado). Se lee de window (recién en el cliente, useHasMounted evita el desajuste de
  // hidratación) en vez de useSearchParams, para no forzar un límite de Suspense en una página
  // que por lo demás es estática.
  const invalidLinkMessage =
    mounted && new URLSearchParams(window.location.search).get("enlace") === "invalido"
      ? "Ese enlace ya venció o ya se usó. Pide que te inviten de nuevo, o ingresa si ya tienes contraseña."
      : undefined;
  const banner = error ?? invalidLinkMessage;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.");
      return;
    }

    setBusy(true);
    setError(undefined);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);

    if (signInError) {
      setError(loginErrorMessage(signInError.message));
      setBusy(false);
      return;
    }

    // El middleware/Server Component leen la cookie recién escrita; refresh() evita servir
    // una versión cacheada de /admin sin sesión.
    router.replace("/admin");
    router.refresh();
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
        <form
          onSubmit={onSubmit}
          className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border-2 border-strong bg-card p-5"
        >
          <div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-ink">
              Acceso de administrador
            </h2>
            <p className="mt-1 text-sm text-soft">Ingresa con tu email y contraseña.</p>
          </div>
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            disabled={busy}
          />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            disabled={busy}
          />
          {banner && (
            <Banner tone="danger" role="alert">
              {banner}
            </Banner>
          )}
          <Button type="submit" big disabled={busy}>
            {busy ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </main>
    </div>
  );
}
