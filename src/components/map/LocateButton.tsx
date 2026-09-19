"use client";

import { Icon } from "@/components/ui/Icon";
import { useGeoStore } from "@/features/route/geoStore";

interface LocateButtonProps {
  onLocate: () => void;
  className?: string;
}

/** "Mi ubicación": pide el GPS si hace falta (es un gesto del usuario) y centra el mapa. */
export function LocateButton({ onLocate, className = "" }: LocateButtonProps) {
  const status = useGeoStore((state) => state.status);
  const searching = status === "requesting";
  return (
    <button
      type="button"
      onClick={() => {
        useGeoStore.getState().start();
        onLocate();
      }}
      aria-label={searching ? "Buscando tu ubicación" : "Ir a mi ubicación"}
      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-strong bg-card text-via shadow-md active:bg-raised ${className}`}
    >
      <Icon name="locate" size={26} className={searching ? "animate-pulse" : ""} />
    </button>
  );
}
