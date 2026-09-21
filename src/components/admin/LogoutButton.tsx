"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="min-h-12 shrink-0 rounded-xl px-3 text-sm font-bold uppercase tracking-wide underline underline-offset-4 active:bg-white/15 disabled:opacity-60"
    >
      {busy ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
