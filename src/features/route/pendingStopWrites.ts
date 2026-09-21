import { z } from "zod";
import { newId } from "@/lib/storage/id";
import { stopStatusSchema } from "@/lib/supabase/schemas";

/** Una escritura de `chofer_update_stop` que agotó los reintentos rápidos y queda pendiente de reintentar sola. */
export interface PendingStopWrite {
  id: string;
  routeStopId: string;
  status: z.infer<typeof stopStatusSchema>;
  note?: string;
  arrivedAt?: string;
  deliveredAt?: string;
}

const pendingStopWriteSchema = z.object({
  id: z.string(),
  routeStopId: z.string(),
  status: stopStatusSchema,
  note: z.string().optional(),
  arrivedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
});

const QUEUE_KEY = "rutatiendas-chofer-write-queue";

/** Mismo storage que recibe cada función (nunca `window.localStorage` directo): así es testeable sin jsdom. */
export interface QueueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** `localStorage` puede no existir (SSR) o estar bloqueado (modo privado estricto); nunca debe romper la app. */
export function safeLocalStorage(): QueueStorage | undefined {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    // ver arriba
  }
  return undefined;
}

export function loadPendingStopWrites(storage: QueueStorage | undefined = safeLocalStorage()): PendingStopWrite[] {
  const raw = storage?.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = pendingStopWriteSchema.array().safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

function savePendingStopWrites(writes: PendingStopWrite[], storage: QueueStorage | undefined): void {
  try {
    storage?.setItem(QUEUE_KEY, JSON.stringify(writes));
  } catch {
    // localStorage lleno o bloqueado: la escritura queda solo en memoria de esta pestaña, no rompe nada
  }
}

/** Encola una escritura que ya agotó sus reintentos rápidos; se reintentará sola (`online`/pestaña visible). */
export function enqueueStopWrite(
  write: Omit<PendingStopWrite, "id">,
  storage: QueueStorage | undefined = safeLocalStorage(),
): PendingStopWrite {
  const entry: PendingStopWrite = { ...write, id: newId() };
  savePendingStopWrites([...loadPendingStopWrites(storage), entry], storage);
  return entry;
}

/** Quita una escritura ya reintentada con éxito. */
export function removeStopWrite(id: string, storage: QueueStorage | undefined = safeLocalStorage()): void {
  savePendingStopWrites(
    loadPendingStopWrites(storage).filter((write) => write.id !== id),
    storage,
  );
}
