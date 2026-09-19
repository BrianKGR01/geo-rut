"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useGeoStore, waitForPosition } from "@/features/route/geoStore";
import { useAppStore } from "@/lib/storage/store";

/** Explica para qué se usa la ubicación ANTES de pedir el permiso, y qué hacer si se negó. */
export function GeoBanner() {
  const status = useGeoStore((state) => state.status);
  const captureStartPoint = useAppStore((state) => state.captureStartPoint);

  const enable = async () => {
    useGeoStore.getState().start();
    const position = await waitForPosition(10_000);
    if (position) captureStartPoint(position);
  };

  if (status === "active") return null;
  if (status === "requesting") return <Banner>Buscando tu ubicación…</Banner>;
  if (status === "denied") {
    return (
      <Banner tone="warn">
        <details>
          <summary className="min-h-8 cursor-pointer py-1">Sin ubicación: todo sigue funcionando a mano.</summary>
          <p className="pb-1">
            La ruta parte de la primera tienda y la llegada se marca con “Ya llegué”. Para activarla, toca
            el candado junto a la dirección, permite “Ubicación” y recarga la página.
          </p>
        </details>
      </Banner>
    );
  }
  if (status === "unavailable") {
    return <Banner tone="warn">Este navegador no ofrece ubicación (se necesita HTTPS). La app funciona igual, a mano.</Banner>;
  }
  return (
    <Banner
      tone={status === "error" ? "warn" : "info"}
      action={
        <Button onClick={enable} className="shrink-0">
          {status === "error" ? "Reintentar" : "Activar"}
        </Button>
      }
    >
      {status === "error"
        ? "No pude obtener tu ubicación."
        : "Activa tu ubicación para ordenar la ruta desde donde estás y detectar cuándo llegas."}
    </Banner>
  );
}
