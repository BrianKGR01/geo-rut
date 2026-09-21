"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PHOTO_LIMIT_MESSAGE,
  uploadRouteStopImage,
  type RouteStopImage,
  type UploadRouteStopImageInput,
} from "@/features/routes/routeStopImages";
import { retryWithBackoff } from "@/lib/http/retryWithBackoff";
import { newId } from "@/lib/storage/id";
import type { SupabaseDb } from "@/lib/supabase/types";
import type { StopStatus } from "@/types/domain";
import { enqueueStopWrite, loadPendingStopWrites, removeStopWrite } from "./pendingStopWrites";

const QUICK_RETRY_DELAYS_MS = [800, 2000, 5000];

export interface StopWriteParams {
  status: StopStatus;
  note?: string;
  arrivedAt?: string;
  deliveredAt?: string;
}

interface QueuedPhoto {
  id: string;
  input: UploadRouteStopImageInput;
}

async function callChoferUpdateStop(supabase: SupabaseDb, routeStopId: string, params: StopWriteParams): Promise<void> {
  const { error } = await supabase.rpc("chofer_update_stop", {
    p_route_stop_id: routeStopId,
    p_status: params.status,
    p_note: params.note,
    p_arrived_at: params.arrivedAt,
    p_delivered_at: params.deliveredAt,
  });
  if (error) throw error;
}

/**
 * Absorbe cortes de señal durante la ejecución de una ruta (`docs/PLAN_V2.md` §9): cada escritura
 * del chofer (llegada/entrega/observación vía `chofer_update_stop`, foto del pedido) se reintenta
 * unas pocas veces con backoff corto (`retryWithBackoff`) y, si sigue sin poder, queda en una cola
 * simple que se reintenta sola al volver la conexión (`online`) o al volver a la pestaña — nunca se
 * pierde el toque del usuario (`docs/BUENAS_PRACTICAS.md`: "nunca fallar en silencio"). Los cambios
 * de estado se persisten en `localStorage` (`pendingStopWrites.ts`, sobreviven a un recargo); las
 * fotos quedan solo en memoria de esta pestaña (un `File` no se puede volcar ahí sin re-trabajo), y
 * se pierden si se cierra la pestaña antes de reconectar — límite documentado en `docs/DECISIONS.md`.
 */
export function useChoferWriteQueue(supabase: SupabaseDb, onPhotoSynced: (stopId: string, image: RouteStopImage) => void) {
  const [retrying, setRetrying] = useState(false);
  const photoQueueRef = useRef<QueuedPhoto[]>([]);
  const flushingRef = useRef(false);
  const onPhotoSyncedRef = useRef(onPhotoSynced);

  // Última versión del callback para no tener que resuscribir `flush` en cada render de quien la usa.
  useEffect(() => {
    onPhotoSyncedRef.current = onPhotoSynced;
  });

  const refreshRetrying = useCallback(() => {
    setRetrying(loadPendingStopWrites().length > 0 || photoQueueRef.current.length > 0);
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      for (const write of loadPendingStopWrites()) {
        try {
          await callChoferUpdateStop(supabase, write.routeStopId, write);
          removeStopWrite(write.id);
        } catch {
          // Sigue en la cola: se reintenta en el próximo disparo (online / pestaña visible).
        }
      }
      for (const queued of photoQueueRef.current) {
        try {
          const image = await uploadRouteStopImage(supabase, queued.input);
          photoQueueRef.current = photoQueueRef.current.filter((item) => item.id !== queued.id);
          onPhotoSyncedRef.current(queued.input.routeStopId, image);
        } catch {
          // Ídem, queda en memoria para el próximo disparo.
        }
      }
    } finally {
      flushingRef.current = false;
      refreshRetrying();
    }
  }, [supabase, refreshRetrying]);

  useEffect(() => {
    // Reintento al montar (por si quedó algo pendiente de una sesión anterior en este navegador) y
    // ante los dos disparadores pedidos: volver la conexión o volver a la pestaña.
    void flush();
    const onOnline = () => void flush();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  /** Nunca lanza: si los reintentos rápidos fallan, encola la escritura y sigue. */
  const persistStopWrite = useCallback(
    async (routeStopId: string, params: StopWriteParams): Promise<void> => {
      try {
        await retryWithBackoff(() => callChoferUpdateStop(supabase, routeStopId, params), { delaysMs: QUICK_RETRY_DELAYS_MS });
      } catch {
        enqueueStopWrite({ routeStopId, ...params });
        refreshRetrying();
      }
    },
    [supabase, refreshRetrying],
  );

  /** Devuelve `ok: true` también cuando queda encolada (no se perdió, sigue intentándose sola). */
  const uploadPhoto = useCallback(
    async (input: UploadRouteStopImageInput): Promise<{ ok: true; image?: RouteStopImage } | { ok: false; message: string }> => {
      try {
        const image = await retryWithBackoff(() => uploadRouteStopImage(supabase, input), { delaysMs: QUICK_RETRY_DELAYS_MS });
        return { ok: true, image };
      } catch (error) {
        if (error instanceof Error && error.message === PHOTO_LIMIT_MESSAGE) return { ok: false, message: PHOTO_LIMIT_MESSAGE };
        photoQueueRef.current = [...photoQueueRef.current, { id: newId(), input }];
        refreshRetrying();
        return { ok: true };
      }
    },
    [supabase, refreshRetrying],
  );

  return { retrying, persistStopWrite, uploadPhoto };
}
