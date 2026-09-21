"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { FIELD_CLASS } from "@/components/ui/TextField";
import type { Driver } from "@/features/drivers/api";
import type { RouteSummary } from "@/features/routes/api";
import { RouteStatusBadge } from "./RouteStatusBadge";

interface RouteInfoCardProps {
  route: RouteSummary;
  drivers: Driver[];
  busy: boolean;
  onAssignDriver: (driverId: string | null) => void;
  onActivate: () => void;
  onFinish: () => void;
  onCancel: () => void;
}

/** Código de la ruta + estado + chofer asignado + los controles de activar/finalizar/cancelar. */
export function RouteInfoCard(props: RouteInfoCardProps) {
  const { route, drivers, busy, onAssignDriver, onActivate, onFinish, onCancel } = props;
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(route.driverCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el código ya está bien visible para copiar a mano.
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border-2 border-line bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-3xl font-bold tracking-[0.2em] text-ink">{route.driverCode}</span>
        <RouteStatusBadge status={route.status} />
      </div>
      <Button variant="secondary" icon="clipboard" onClick={copyCode}>
        {copied ? "¡Copiado!" : "Copiar código"}
      </Button>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-bold uppercase tracking-wide text-soft" htmlFor="route-driver">
          Chofer
        </label>
        <select
          id="route-driver"
          className={FIELD_CLASS}
          value={route.driverId ?? ""}
          disabled={busy}
          onChange={(event) => onAssignDriver(event.target.value || null)}
        >
          <option value="">Sin asignar</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
      </div>
      {route.status === "draft" && (
        <div className="flex gap-2">
          <Button variant="success" icon="play" className="flex-1" disabled={busy} onClick={onActivate}>
            Activar
          </Button>
          <Button variant="danger" icon="x" className="flex-1" disabled={busy} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      )}
      {route.status === "active" && (
        <Button variant="success" icon="flag" disabled={busy} onClick={onFinish}>
          Finalizar
        </Button>
      )}
      {route.status === "finished" && (
        <p className="flex items-center gap-2 text-sm font-semibold text-soft">
          <Icon name="check" size={18} className="text-ok" /> Ruta finalizada, sin más cambios de estado.
        </p>
      )}
    </section>
  );
}
