"use client";

import { useId, type ReactNode } from "react";

interface SheetProps {
  title: string;
  onClose: () => void;
  closeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Sin relleno ni scroll: para contenido que ocupa todo (mapas). */
  flush?: boolean;
}

/** Hoja a pantalla completa: en un celular es más clara que un modal flotante. */
export function Sheet({ title, onClose, closeLabel = "Cerrar", children, footer, flush }: SheetProps) {
  const titleId = useId();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="app-shell fixed inset-0 z-40 flex flex-col bg-paper"
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b-2 border-ink pl-4 pr-1">
        <h2 id={titleId} className="truncate text-lg font-extrabold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 shrink-0 rounded-xl px-4 font-semibold text-brand-strong underline"
        >
          {closeLabel}
        </button>
      </header>
      <div className={flush ? "relative min-h-0 flex-1" : "min-h-0 flex-1 overflow-y-auto p-4"}>
        {children}
      </div>
      {footer && (
        <footer className="pb-safe flex shrink-0 flex-col gap-2 border-t-2 border-line px-4 pt-3">
          {footer}
        </footer>
      )}
    </div>
  );
}
