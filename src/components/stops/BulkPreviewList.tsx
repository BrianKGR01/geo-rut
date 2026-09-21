import type { BulkPreviewItem } from "@/features/stops/importStops";

const STATUS_TONE: Record<BulkPreviewItem["status"], string> = {
  ok: "text-ok",
  duplicate: "text-soft",
  error: "text-danger",
};

function itemTone(item: BulkPreviewItem): string {
  if (item.status === "ok" && item.approximate) return "text-warn";
  return STATUS_TONE[item.status];
}

function itemStatusText(item: BulkPreviewItem): string {
  if (item.status === "ok") return item.approximate ? "Aproximada, conviene revisar el pin" : "Ubicación exacta";
  if (item.status === "duplicate") return "Ya existe una tienda ahí cerca, se omite";
  return item.reason;
}

function itemLabel(item: BulkPreviewItem): string {
  return item.status === "error" ? item.text : item.name || "Tienda sin nombre";
}

interface BulkPreviewListProps {
  items: BulkPreviewItem[];
}

/** Presentacional puro: una fila por bloque revisado, con el estado en español. */
export function BulkPreviewList({ items }: BulkPreviewListProps) {
  return (
    <ul aria-label="Vista previa de tiendas a importar" className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.line} className="rounded-xl border-2 border-line bg-card px-3 py-2">
          <p className="truncate text-base font-bold leading-tight text-ink">{itemLabel(item)}</p>
          <p className={`text-sm font-semibold ${itemTone(item)}`}>{itemStatusText(item)}</p>
        </li>
      ))}
    </ul>
  );
}
