const decimal = new Intl.NumberFormat("es", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const monto = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 });

/** Bs, sin decimales: el monto del pedido siempre es múltiplo de 5 (`pedidoMontoInputSchema`). */
export function formatMonto(value: number): string {
  return `Bs ${monto.format(value)}`;
}

export function formatDistance(meters: number): string {
  if (meters < 950) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${decimal.format(meters / 1000)} km`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/** Fecha corta + hora, para listas de administrador (p. ej. "21 sept, 14:30"). */
export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    date,
  );
}
