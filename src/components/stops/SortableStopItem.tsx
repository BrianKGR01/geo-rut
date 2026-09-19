"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Stop } from "@/types/domain";
import { StopRow } from "./StopRow";

interface SortableStopItemProps {
  stop: Stop;
  label: string;
  legText?: string;
  highlighted: boolean;
  onOpen: () => void;
}

export function SortableStopItem({ stop, label, legText, highlighted, onOpen }: SortableStopItemProps) {
  // Solo las pendientes se arrastran; la que se está entregando se queda donde está.
  const draggable = stop.status === "pending";
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: stop.id, disabled: !draggable });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-90 shadow-xl" : undefined}
    >
      <StopRow
        stop={stop}
        label={label}
        legText={legText}
        highlighted={highlighted}
        onOpen={onOpen}
        handle={
          draggable && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`Mover ${stop.name}`}
              className="flex w-12 shrink-0 touch-none items-center justify-center rounded-r-xl border-l-2 border-line text-2xl text-ink-soft active:bg-surface"
            >
              <span aria-hidden="true">≡</span>
            </button>
          )
        }
      />
    </li>
  );
}
