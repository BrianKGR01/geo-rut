"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { canDeactivateAdmin, deactivateAdmin } from "@/features/admins/api";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { AdminSectionHeader } from "./AdminSectionHeader";
import { InviteAdminSheet, type AdminWithEmail } from "./InviteAdminSheet";

interface AdminsScreenProps {
  admins: AdminWithEmail[];
  currentUserId: string;
}

export function AdminsScreen({ admins: initialAdmins, currentUserId }: AdminsScreenProps) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toRemove, setToRemove] = useState<AdminWithEmail | null>(null);
  const [error, setError] = useState<string>();

  const confirmRemove = async () => {
    if (!toRemove) return;
    setError(undefined);
    const supabase = createClient();
    try {
      await deactivateAdmin(supabase, toRemove.userId, currentUserId);
      setAdmins((prev) => prev.filter((admin) => admin.userId !== toRemove.userId));
    } catch {
      setError("No se pudo quitar el acceso. Intenta de nuevo.");
    } finally {
      setToRemove(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <AdminSectionHeader
        title="Administradores"
        backHref="/admin"
        action={
          <Button icon="plus" onClick={() => setInviteOpen(true)}>
            Invitar
          </Button>
        }
      />
      {error && (
        <Banner tone="danger" role="alert">
          {error}
        </Banner>
      )}
      <ul className="flex flex-col gap-2">
        {admins.map((admin) => {
          const isSelf = admin.userId === currentUserId;
          const blocked = !canDeactivateAdmin(admin.userId, currentUserId, admins.length);
          const label = admin.displayName || admin.email || "Administrador";
          return (
            <li
              key={admin.userId}
              className="flex min-h-14 items-center justify-between gap-2 rounded-xl border-2 border-line bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">
                  {label}
                  {isSelf ? " (vos)" : ""}
                </p>
                {admin.email && admin.displayName && <p className="truncate text-sm text-soft">{admin.email}</p>}
                <p className="text-xs text-soft">Desde {formatDateTime(admin.createdAt)}</p>
                {blocked && <p className="text-xs font-semibold text-warn">Único administrador activo: no se puede quitar.</p>}
              </div>
              <button
                type="button"
                onClick={() => setToRemove(admin)}
                disabled={blocked}
                aria-label={`Quitar acceso a ${label}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-danger active:bg-danger-tint disabled:opacity-40"
              >
                <Icon name="trash" size={20} />
              </button>
            </li>
          );
        })}
      </ul>
      {inviteOpen && (
        <InviteAdminSheet
          onInvited={(admin) => {
            setAdmins((prev) => [...prev, admin]);
            setInviteOpen(false);
          }}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {toRemove && (
        <ConfirmDialog
          title="Quitar acceso"
          message={`${toRemove.displayName || toRemove.email || "Este administrador"} ya no va a poder entrar al panel.`}
          confirmLabel="Quitar acceso"
          destructive
          onConfirm={confirmRemove}
          onCancel={() => setToRemove(null)}
        />
      )}
    </div>
  );
}
