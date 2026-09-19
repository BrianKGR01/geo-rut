"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useGeoStore, waitForPosition } from "@/features/route/geoStore";
import { useAppStore } from "@/lib/storage/store";

/** Explica para qué se usa la ubicación ANTES de pedir el permiso, y qué hacer si no se pudo obtener. */
export function GeoBanner() {
  const status = useGeoStore((state) => state.status);

  const enable = async () => {
    useGeoStore.getState().start();
    const position = await waitForPosition(10_000);
    const { settings, captureStartPoint } = useAppStore.getState();
    if (position && settings.startMode === "gps") captureStartPoint(position);
  };

  if (status === "active") return null;
  if (status === "requesting") return <Banner>Buscando tu ubicación…</Banner>;
  if (status === "unavailable") {
    return (
      <Banner tone="warn">
        Este navegador no da la ubicación (hace falta HTTPS). Todo funciona igual, a mano.
      </Banner>
    );
  }
  if (status === "denied" || status === "error") {
    return (
      <Banner
        tone="warn"
        action={
          <Button variant="secondary" icon="refresh" onClick={enable} className="shrink-0">
            Reintentar
          </Button>
        }
      >
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center">
            No pude obtener tu ubicación. ¿Cómo lo arreglo?
          </summary>
          <ol className="list-decimal space-y-1 pb-2 pl-5 font-medium">
            <li>Enciende la ubicación (GPS) del celular.</li>
            <li>En Ajustes de Android → Apps → Chrome → Permisos, permite “Ubicación”.</li>
            <li>Toca el ícono a la izquierda de la dirección de esta página → Permisos → Ubicación → Permitir.</li>
            <li>Vuelve aquí y toca “Reintentar”.</li>
          </ol>
          <p className="pb-1 font-medium">Mientras tanto todo funciona a mano: la llegada se marca con “Ya llegué”.</p>
        </details>
      </Banner>
    );
  }
  return (
    <Banner
      action={
        <Button icon="locate" onClick={enable} className="shrink-0">
          Activar
        </Button>
      }
    >
      Activa tu ubicación: ordena desde donde estás y detecta cuándo llegas.
    </Banner>
  );
}
