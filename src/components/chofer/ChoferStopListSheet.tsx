"use client";

import { useMemo } from "react";
import { StopListPanel } from "@/components/stops/StopListPanel";
import { Sheet } from "@/components/ui/Sheet";
import type { ChoferStop } from "@/features/route/choferRouteMapping";
import { legByStopId } from "@/features/route/planRoute";
import type { LegsCache } from "@/types/domain";

interface ChoferStopListSheetProps {
  delivered: ChoferStop[];
  remaining: ChoferStop[];
  nextId: string | undefined;
  legsCache: LegsCache | undefined;
  onClose: () => void;
  onOpenStop: (stopId: string) => void;
}

/**
 * "Ver lista" del chofer: mismo `StopListPanel` de v1, de solo lectura (el orden lo arma el
 * administrador, `onReorder` no hace nada). Tocar una tienda delega en `onOpenStop`, que la
 * pantalla dueña resuelve con el mismo `ChoferStopSheet` que abren los marcadores del mapa.
 */
export function ChoferStopListSheet(props: ChoferStopListSheetProps) {
  const { delivered, remaining, nextId, legsCache, onClose, onOpenStop } = props;
  const legs = useMemo(() => legByStopId(legsCache), [legsCache]);

  return (
    <Sheet title="Tiendas de la ruta" onClose={onClose} closeKind="back">
      <StopListPanel
        delivered={delivered}
        remaining={remaining}
        nextId={nextId}
        legs={legs}
        onOpenStop={onOpenStop}
        onReorder={() => {
          // El orden lo decide el administrador (route_stops.position); el chofer solo lo mira.
        }}
      />
    </Sheet>
  );
}
