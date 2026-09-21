import type { ReactNode } from "react";

interface ChoferMessageScreenProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

/** Pantalla centrada simple para los estados sin ruta que mostrar (cargando, sin acceso, error). */
export function ChoferMessageScreen({ title, message, action }: ChoferMessageScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="status">
      <p className="font-display text-2xl font-bold uppercase tracking-wide">{title}</p>
      {message && <p className="text-soft">{message}</p>}
      {action}
    </div>
  );
}
