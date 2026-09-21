"use client";

import { useMemo } from "react";
import { StopListPanel } from "@/components/stops/StopListPanel";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { ChoferStop } from "@/features/route/choferRouteMapping";
import { legByStopId } from "@/features/route/planRoute";
import type { LegsCache } from "@/types/domain";

interface ChoferStopListSheetProps {
  delivered: ChoferStop[];
  remaining: ChoferStop[];
  nextId: string | undefined;
  legsCache: LegsCache | undefined;
  optimizing: boolean;
  optimizeError: string | undefined;
  onClose: () => void;
  onOpenStop: (stopId: string) => void;
  onOptimize: () => void;
}

/**
 * "Ver lista" del chofer: mismo `StopListPanel` de v1, más el botón "Optimizar ruta" (RF-6). El
 * arrastre manual queda deshabilitado a propósito (`onReorder` no hace nada): el pedido fue
 * específicamente el botón de optimizar automático, no dejar que el chofer arrastre a mano. Tocar
 * una tienda delega en `onOpenStop`, que la pantalla dueña resuelve con el mismo `ChoferStopSheet`
 * que abren los marcadores del mapa.
 */
export function ChoferStopListSheet(props: ChoferStopListSheetProps) {
  const { delivered, remaining, nextId, legsCache, optimizing, optimizeError, onClose, onOpenStop, onOptimize } = props;
  const legs = useMemo(() => legByStopId(legsCache), [legsCache]);
  const pendingCount = remaining.filter((stop) => stop.status === "pending").length;

  return (
    <Sheet title="Tiendas de la ruta" onClose={onClose} closeKind="back">
      <div className="mb-3 flex flex-col gap-2">
        <Button variant="secondary" icon="bolt" onClick={onOptimize} disabled={optimizing || pendingCount < 2}>
          {optimizing ? "Optimizando…" : "Optimizar ruta"}
        </Button>
        {optimizeError && (
          <Banner tone="danger" role="alert">
            {optimizeError}
          </Banner>
        )}
      </div>
      <StopListPanel
        delivered={delivered}
        remaining={remaining}
        nextId={nextId}
        legs={legs}
        onOpenStop={onOpenStop}
        onReorder={() => {
          // El arrastre manual queda deshabilitado a propósito: el orden se cambia con "Optimizar ruta".
        }}
      />
    </Sheet>
  );
}
