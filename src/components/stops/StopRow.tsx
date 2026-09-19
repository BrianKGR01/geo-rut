import type { ReactNode } from "react";
import { STATUS_LABEL } from "@/features/route/selectors";
import type { Stop } from "@/types/domain";

const BADGE: Record<Stop["status"], string> = {
  pending: "bg-ink text-white",
  delivering: "bg-warn text-white",
  delivered: "bg-ok text-white",
};

const CHIP: Record<Stop["status"], string> = {
  pending: "bg-surface text-ink",
  delivering: "bg-warn-soft text-warn",
  delivered: "bg-ok-soft text-ok",
};

interface StopRowProps {
  stop: Stop;
  /** Número de visita; las entregadas muestran ✓. */
  label: string;
  legText?: string;
  highlighted?: boolean;
  onOpen: () => void;
  /** Asa de arrastre (solo en paradas reordenables). */
  handle?: ReactNode;
}

export function StopRow({ stop, label, legText, highlighted, onOpen, handle }: StopRowProps) {
  return (
    <div
      className={`flex min-h-16 items-stretch rounded-xl border-2 bg-paper ${
        highlighted ? "border-brand" : "border-line"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left"
        aria-label={`${stop.name}, ${STATUS_LABEL[stop.status]}. Ver detalle`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${BADGE[stop.status]}`}
          aria-hidden="true"
        >
          {label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold">{stop.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${CHIP[stop.status]}`}>
              {STATUS_LABEL[stop.status]}
            </span>
            {legText && <span>{legText}</span>}
            {stop.note && <span className="truncate">“{stop.note}”</span>}
          </span>
        </span>
      </button>
      {handle}
    </div>
  );
}
