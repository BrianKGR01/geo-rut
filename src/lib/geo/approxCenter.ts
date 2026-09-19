import type { LatLng } from "@/types/domain";
import { isValidLatLng } from "./haversine";

export interface ApproxCenter extends LatLng {
  zoom: number;
}

/** Sin ninguna pista se muestra Sudamérica entera en vez de inventar una ciudad. */
export const FALLBACK_CENTER: ApproxCenter = { lat: -15, lng: -62, zoom: 3 };

// Zona horaria del dispositivo → vista del país. No identifica a nadie y no usa red.
const BY_TIME_ZONE: Record<string, ApproxCenter> = {
  "America/La_Paz": { lat: -17.2, lng: -64.6, zoom: 6 },
  "America/Lima": { lat: -9.6, lng: -75.2, zoom: 5 },
  "America/Bogota": { lat: 4.6, lng: -74.1, zoom: 5 },
  "America/Guayaquil": { lat: -1.6, lng: -78.6, zoom: 6 },
  "America/Santiago": { lat: -33.4, lng: -70.7, zoom: 5 },
  "America/Asuncion": { lat: -23.4, lng: -58.4, zoom: 6 },
  "America/Montevideo": { lat: -32.8, lng: -56, zoom: 6 },
  "America/Caracas": { lat: 7.1, lng: -66.2, zoom: 5 },
  "America/Argentina/Buenos_Aires": { lat: -34.6, lng: -58.4, zoom: 5 },
  "America/Sao_Paulo": { lat: -15.8, lng: -47.9, zoom: 4 },
  "America/Mexico_City": { lat: 23.6, lng: -102.5, zoom: 5 },
  "America/Guatemala": { lat: 15.5, lng: -90.3, zoom: 7 },
  "America/El_Salvador": { lat: 13.7, lng: -88.9, zoom: 8 },
  "America/Tegucigalpa": { lat: 14.8, lng: -86.6, zoom: 7 },
  "America/Managua": { lat: 12.9, lng: -85.2, zoom: 7 },
  "America/Costa_Rica": { lat: 9.9, lng: -84.1, zoom: 7 },
  "America/Panama": { lat: 8.5, lng: -80.1, zoom: 7 },
  "America/Santo_Domingo": { lat: 18.7, lng: -70.2, zoom: 7 },
  "Europe/Madrid": { lat: 40.2, lng: -3.7, zoom: 5 },
};

export function centerFromTimeZone(timeZone: string | undefined): ApproxCenter {
  return (timeZone && BY_TIME_ZONE[timeZone]) || FALLBACK_CENTER;
}

/**
 * Vercel agrega a cada request la ubicación aproximada de la IP (nivel ciudad), gratis y sin claves.
 * Fuera de Vercel esos encabezados no existen y se devuelve `null`.
 */
export function centerFromGeoHeaders(headers: Headers): ApproxCenter | null {
  const lat = Number(headers.get("x-vercel-ip-latitude") ?? Number.NaN);
  const lng = Number(headers.get("x-vercel-ip-longitude") ?? Number.NaN);
  if (!isValidLatLng(lat, lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng, zoom: 12 };
}
