"use client";

import { Sheet } from "@/components/ui/Sheet";
import type { RouteStopDetail } from "@/features/routes/api";
import type { RouteStopImage } from "@/features/routes/routeStopImages";
import type { RouteStopItem } from "@/features/routes/routeStopItems";
import { OrderImagesPanel } from "./order/OrderImagesPanel";
import { OrderItemsEditor } from "./order/OrderItemsEditor";
import { OrderMontoField } from "./order/OrderMontoField";

export interface OrderStopPatch {
  pedidoMonto?: number | null;
  items?: RouteStopItem[];
  images?: RouteStopImage[];
}

interface OrderSheetProps {
  routeId: string;
  stop: RouteStopDetail;
  currentUserId: string;
  onClose: () => void;
  onUpdated: (stopId: string, patch: OrderStopPatch) => void;
}

/** Hoja "Editar pedido": monto total, partidas y fotos de una tienda dentro de una ruta. */
export function OrderSheet({ routeId, stop, currentUserId, onClose, onUpdated }: OrderSheetProps) {
  return (
    <Sheet title={stop.name} onClose={onClose} closeKind="back">
      <div className="flex flex-col gap-4">
        <OrderMontoField
          routeStopId={stop.id}
          pedidoMonto={stop.pedidoMonto}
          onSaved={(pedidoMonto) => onUpdated(stop.id, { pedidoMonto })}
        />
        <OrderItemsEditor
          routeStopId={stop.id}
          items={stop.items}
          currentUserId={currentUserId}
          onChange={(items) => onUpdated(stop.id, { items })}
        />
        <OrderImagesPanel
          routeId={routeId}
          routeStopId={stop.id}
          images={stop.images}
          currentUserId={currentUserId}
          onChange={(images) => onUpdated(stop.id, { images })}
        />
      </div>
    </Sheet>
  );
}
