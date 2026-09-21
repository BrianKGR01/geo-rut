import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

interface AdminSectionHeaderProps {
  title: string;
  backHref: string;
  action?: ReactNode;
}

/** Título + volver, reutilizado por las pantallas de administrador (choferes/administradores/rutas). */
export function AdminSectionHeader({ title, backHref, action }: AdminSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href={backHref}
          aria-label="Volver"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-soft active:bg-raised"
        >
          <Icon name="arrow-left" size={22} />
        </Link>
        <h2 className="truncate font-display text-2xl font-bold uppercase tracking-wide text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}
