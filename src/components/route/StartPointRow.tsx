"use client";

import { Icon } from "@/components/ui/Icon";
import { useAppStore } from "@/lib/storage/store";

/** Primera fila de la lista: de dónde sale la ruta. No es una tienda: no se entrega ni se arrastra. */
export function StartPointRow({ onChange }: { onChange: () => void }) {
  const settings = useAppStore((state) => state.settings);
  const hasStartPoint = useAppStore((state) => state.route.startPoint !== undefined);
  const fixed = settings.startMode === "fixed" ? settings.fixedStart : undefined;
  const title = fixed ? fixed.label : "Mi ubicación actual";
  const detail = fixed ? "punto fijo" : hasStartPoint ? "ubicación capturada" : "se toma al iniciar";

  return (
    <button
      type="button"
      onClick={onChange}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-dashed border-via-solid bg-card px-3 py-2 text-left active:bg-raised"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-via-solid text-white">
        <Icon name={fixed ? "home" : "locate"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold uppercase tracking-wide text-soft">Partida · {detail}</span>
        <span className="block truncate text-lg font-bold leading-tight">{title}</span>
      </span>
      <span className="shrink-0 text-sm font-bold text-via underline underline-offset-4">Cambiar</span>
    </button>
  );
}
