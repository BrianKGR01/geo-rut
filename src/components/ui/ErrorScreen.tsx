"use client";

import { buttonClass } from "./Button";

interface ErrorScreenProps {
  onRetry: () => void;
}

/** Pantalla de error de último recurso. Nunca borra datos: las tiendas siguen en el dispositivo. */
export function ErrorScreen({ onRetry }: ErrorScreenProps) {
  return (
    <div className="app-shell flex flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
      <h1 className="text-2xl font-extrabold">Algo salió mal</h1>
      <p className="text-ink-soft">
        Tus tiendas y entregas siguen guardadas en este celular. Recarga para continuar donde estabas.
      </p>
      <button type="button" className={`${buttonClass("primary", true)} w-full max-w-xs`} onClick={() => window.location.reload()}>
        Recargar
      </button>
      <button type="button" className={`${buttonClass("secondary")} w-full max-w-xs`} onClick={onRetry}>
        Reintentar sin recargar
      </button>
    </div>
  );
}
