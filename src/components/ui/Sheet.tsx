"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import { useBackLayer } from "./useBackLayer";

interface SheetProps {
  title: string;
  onClose: () => void;
  /** "back" = volver al paso anterior (flecha); "close" = salir de la hoja (✕). */
  closeKind?: "back" | "close";
  children: ReactNode;
  footer?: ReactNode;
  /** Sin relleno ni scroll: para contenido que ocupa todo (mapas). */
  flush?: boolean;
}

/** Hoja a pantalla completa: en un celular es más clara que un modal flotante. */
export function Sheet({ title, onClose, closeKind = "close", children, footer, flush }: SheetProps) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  // El botón/gesto "atrás" del celular hace lo mismo que el botón de la cabecera.
  useBackLayer(onClose);

  // Al abrir, el foco entra a la hoja (lectores de pantalla y teclado).
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={containerRef}
      tabIndex={-1}
      // Escape cierra solo la hoja que tiene el foco (puede haber varias apiladas).
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className="app-shell sheet-in fixed inset-0 z-40 flex flex-col bg-page outline-none"
    >
      <header className="pt-safe shrink-0 bg-chrome text-on-chrome">
        <div className="flex h-14 items-center gap-1 pr-4">
          <button
            type="button"
            onClick={onClose}
            aria-label={closeKind === "back" ? "Volver" : "Cerrar"}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl active:bg-white/15"
          >
            <Icon name={closeKind === "back" ? "arrow-left" : "x"} size={26} />
          </button>
          <h2 id={titleId} className="truncate font-display text-2xl font-bold uppercase tracking-wide">
            {title}
          </h2>
        </div>
      </header>
      <div className={flush ? "relative min-h-0 flex-1" : "min-h-0 flex-1 overflow-y-auto p-4"}>
        {children}
      </div>
      {footer && (
        <footer className="pb-safe flex shrink-0 flex-col gap-2 border-t-2 border-strong bg-card px-4 pt-3">
          {footer}
        </footer>
      )}
    </div>
  );
}
