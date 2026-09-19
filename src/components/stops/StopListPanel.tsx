"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatDistance, formatDuration } from "@/lib/format";
import type { RouteLeg, Stop } from "@/types/domain";
import { SortableStopItem } from "./SortableStopItem";
import { StopRow } from "./StopRow";

interface StopListPanelProps {
  delivered: Stop[];
  remaining: Stop[];
  nextId?: string;
  legs: Map<string, RouteLeg>;
  onOpenStop: (id: string) => void;
  onReorder: (remainingIds: string[]) => void;
}

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function StopListPanel(props: StopListPanelProps) {
  const { delivered, remaining, nextId, legs, onOpenStop, onReorder } = props;
  const [showDelivered, setShowDelivered] = useState(false);
  const sensors = useSensors(
    // Unos píxeles de tolerancia para que un toque sobre el asa no cuente como arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = remaining.map((stop) => stop.id);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from !== -1 && to !== -1) onReorder(arrayMove(ids, from, to));
  };

  const legText = (stop: Stop) => {
    const leg = legs.get(stop.id);
    return leg ? `${formatDistance(leg.distanceM)} · ${formatDuration(leg.durationS)}` : undefined;
  };

  return (
    <div className="flex flex-col gap-2 overflow-x-hidden pb-1">
      {delivered.length > 0 && (
        <section aria-label="Tiendas entregadas" className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowDelivered((open) => !open)}
            aria-expanded={showDelivered}
            className="flex min-h-12 items-center justify-between rounded-xl border-2 border-ok-solid bg-ok-tint px-3 text-left font-bold text-ink"
          >
            <span className="flex items-center gap-2">
              <Icon name="check" size={20} className="text-ok" />
              Entregadas ({delivered.length})
            </span>
            <Icon name={showDelivered ? "chevron-up" : "chevron-down"} />
          </button>
          {showDelivered &&
            delivered.map((stop) => (
              <StopRow key={stop.id} stop={stop} label="✓" onOpen={() => onOpenStop(stop.id)} />
            ))}
        </section>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[verticalOnly]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-2" aria-label="Tiendas por visitar">
            {remaining.map((stop, index) => (
              <SortableStopItem
                key={stop.id}
                stop={stop}
                label={String(index + 1)}
                legText={legText(stop)}
                highlighted={stop.id === nextId}
                onOpen={() => onOpenStop(stop.id)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
