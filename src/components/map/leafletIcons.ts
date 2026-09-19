import L from "leaflet";
import type { MarkerVariant } from "@/types/map";

const SIZE: Record<MarkerVariant, number> = {
  pending: 32,
  next: 40,
  delivering: 40,
  delivered: 26,
};

const cache = new Map<string, L.DivIcon>();

/** Los íconos se reutilizan para no recrear capas de Leaflet en cada render. */
export function numberedIcon(label: string, variant: MarkerVariant): L.DivIcon {
  const key = `${variant}:${label}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const size = SIZE[variant];
  const icon = L.divIcon({
    // `label` siempre es un número o "✓" generado por la app, nunca texto del usuario.
    html: label,
    className: `stop-marker stop-marker--${variant}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
