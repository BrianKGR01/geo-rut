import L from "leaflet";
import type { MarkerVariant } from "@/types/map";

const SIZE: Record<MarkerVariant, number> = {
  pending: 32,
  next: 40,
  delivering: 40,
  delivered: 26,
};

const HIT_SIZE = 44;

const cache = new Map<string, L.DivIcon>();

/** Los íconos se reutilizan para no recrear capas de Leaflet en cada render. */
export function numberedIcon(label: string, variant: MarkerVariant): L.DivIcon {
  const key = `${variant}:${label}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const size = SIZE[variant];
  const icon = L.divIcon({
    // `label` siempre es un número o "✓" generado por la app, nunca texto del usuario.
    html: `<span class="stop-marker stop-marker--${variant}" style="width:${size}px;height:${size}px">${label}</span>`,
    // El área táctil es de 44 px aunque el círculo visible sea más chico.
    className: "stop-marker-hit",
    iconSize: [HIT_SIZE, HIT_SIZE],
    iconAnchor: [HIT_SIZE / 2, HIT_SIZE / 2],
  });
  cache.set(key, icon);
  return icon;
}

export const pinIcon = L.divIcon({
  html: '<div class="pin-marker"></div>',
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 44],
});
