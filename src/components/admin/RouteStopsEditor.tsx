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
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/ui/Icon";
import type { RouteStopDetail } from "@/features/routes/api";
import { formatMonto } from "@/lib/format";

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

interface RouteStopsEditorProps {
  stops: RouteStopDetail[];
  onReorder: (orderedIds: string[]) => void;
  onRemove: (stop: RouteStopDetail) => void;
  onEditOrder: (stop: RouteStopDetail) => void;
}

/** Lista reordenable de las tiendas de una ruta (dnd-kit, mismo patrón que `StopListPanel` de v1). */
export function RouteStopsEditor({ stops, onReorder, onRemove, onEditOrder }: RouteStopsEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = stops.map((stop) => stop.id);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from !== -1 && to !== -1) onReorder(arrayMove(ids, from, to));
  };

  if (stops.length === 0) {
    return <p className="text-sm text-soft">Todavía no agregaste tiendas a esta ruta.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-2" aria-label="Tiendas de la ruta">
          {stops.map((stop, index) => (
            <SortableRouteStopRow
              key={stop.id}
              stop={stop}
              label={index + 1}
              onRemove={() => onRemove(stop)}
              onEditOrder={() => onEditOrder(stop)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

interface SortableRouteStopRowProps {
  stop: RouteStopDetail;
  label: number;
  onRemove: () => void;
  onEditOrder: () => void;
}

/** Resumen corto del pedido para la fila: monto, cantidad de partidas y de fotos, o "sin pedido". */
function orderSummary(stop: RouteStopDetail): string {
  const parts: string[] = [];
  if (stop.pedidoMonto !== null) parts.push(formatMonto(stop.pedidoMonto));
  if (stop.items.length > 0) parts.push(`${stop.items.length} partida${stop.items.length === 1 ? "" : "s"}`);
  if (stop.images.length > 0) parts.push(`${stop.images.length} foto${stop.images.length === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(" · ") : "Sin pedido cargado — toca para agregar";
}

function SortableRouteStopRow({ stop, label, onRemove, onEditOrder }: SortableRouteStopRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-95 drop-shadow-xl" : undefined}
    >
      <div className="flex min-h-[60px] items-stretch rounded-xl border-2 border-line bg-card">
        <button
          type="button"
          onClick={onEditOrder}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-l-xl px-3 py-2 text-left active:bg-raised"
          aria-label={`${stop.name}. Editar pedido`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-plate font-display text-xl font-bold text-white">
            {label}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-bold text-ink">{stop.name}</span>
            <span className="block truncate text-sm text-soft">{orderSummary(stop)}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${stop.name}`}
          className="flex w-12 shrink-0 items-center justify-center border-l-2 border-line text-danger active:bg-danger-tint"
        >
          <Icon name="trash" size={20} />
        </button>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Mover ${stop.name}`}
          className="flex w-12 shrink-0 touch-none items-center justify-center rounded-r-[10px] border-l-2 border-line text-soft active:bg-raised"
        >
          <Icon name="grip" size={24} />
        </button>
      </div>
    </li>
  );
}
