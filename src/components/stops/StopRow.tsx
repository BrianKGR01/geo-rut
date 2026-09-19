import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { STATUS_LABEL } from "@/features/route/selectors";
import type { Stop } from "@/types/domain";

const CHIP: Record<Stop["status"], string> = {
  pending: "bg-raised text-soft",
  delivering: "bg-warn-solid text-white",
  delivered: "bg-ok-solid text-white",
};

interface StopRowProps {
  stop: Stop;
  /** Número de visita; las entregadas muestran ✓. */
  label: string;
  legText?: string;
  /** Es la tienda que toca ahora: placa amarilla, como en el mapa. */
  highlighted?: boolean;
  onOpen: () => void;
  /** Asa de arrastre (solo en paradas reordenables). */
  handle?: ReactNode;
}

function plateClass(stop: Stop, highlighted: boolean): string {
  if (stop.status === "delivered") return "bg-ok-solid text-white";
  if (stop.status === "delivering") return "bg-warn-solid text-white";
  return highlighted ? "bg-signal text-on-signal ring-2 ring-on-signal" : "bg-plate text-white";
}

export function StopRow({ stop, label, legText, highlighted = false, onOpen, handle }: StopRowProps) {
  return (
    <div
      className={`flex min-h-[68px] items-stretch rounded-xl border-2 bg-card ${
        highlighted ? "border-strong shadow-[0_3px_0_0_var(--signal)]" : "border-line"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left active:bg-raised"
        aria-label={`${stop.name}, ${STATUS_LABEL[stop.status]}. Ver detalle`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] font-display text-2xl font-bold ${plateClass(stop, highlighted)}`}
          aria-hidden="true"
        >
          {stop.status === "delivered" ? <Icon name="check" size={24} /> : label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold leading-tight">{stop.name}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-soft">
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide ${CHIP[stop.status]}`}>
              {STATUS_LABEL[stop.status]}
            </span>
            {legText && <span className="font-semibold text-ink">{legText}</span>}
            {stop.note && <span className="truncate">“{stop.note}”</span>}
          </span>
        </span>
      </button>
      {handle}
    </div>
  );
}
