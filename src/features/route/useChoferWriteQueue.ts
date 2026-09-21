"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRoute } from "@/features/routes/api";
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
 * RPC que reordena las tiendas no entregadas de la ruta (RF-6, chofer). A diferencia del resto de
 * las escrituras de este archivo, no pasa por la cola de reintentos: es una acción puntual que
 * dispara `useChoferRoute.optimizeStops` desde un toque del chofer, así que ante un fallo alcanza
 * con mostrar un error y dejar que vuelva a tocar el botón.
 */
export async function reorderChoferStops(supabase: SupabaseDb, routeId: string, orderedIds: string[]): Promise<void> {
  const { error } = await supabase.rpc("chofer_reorder_stops", {
    p_route_id: routeId,
    p_ordered_ids: orderedIds,
  });
  if (error) throw error;
}

/**
 * Distingue un fallo transitorio (sin señal, se sigue reintentando) de uno permanente (el chofer ya
 * no tiene acceso a esta ruta: el admin la finalizó/canceló mientras la escritura estaba encolada).
 * No hay un código de error propio que reconocer acá (a diferencia del tope de fotos, que sí lo
 * tiene vía `isPhotoLimitError`): se reusa la misma señal que ya usa `useChoferRoute` para decidir
 * "not-found" — releer la ruta con RLS y ver si sigue devolviendo algo.
 */
async function isRouteStillAccessible(supabase: SupabaseDb, routeId: string): Promise<boolean> {
  try {
    return (await getRoute(supabase, routeId)) !== null;
  } catch {
    // No se pudo confirmar (p. ej. seguimos sin señal): se asume que sigue accesible para no
    // descartar una escritura encolada por un corte transitorio.
    return true;
  }
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
 * Un rechazo permanente (no un corte de señal) nunca queda reintentando para siempre: el tope de 3
 * fotos se descarta y se avisa (`droppedPhotoMessage`), y la pérdida de acceso a la ruta (el admin
 * la finalizó/canceló mientras había algo encolado) descarta todo lo pendiente y avisa vía
 * `onAccessLost`, que `useChoferRoute` usa para llevar al chofer a la misma pantalla de "ya no
 * tienes acceso" que ve si recarga.
 */
export function useChoferWriteQueue(
  supabase: SupabaseDb,
  routeId: string,
  onPhotoSynced: (stopId: string, image: RouteStopImage) => void,
  onAccessLost: () => void,
) {
  const [retrying, setRetrying] = useState(false);
  // Una foto encolada offline que terminó rechazada para siempre (tope de 3 ya alcanzado por otra
  // subida mientras tanto): no hay a quién devolverle el error (el `handleFile` que la disparó ya
  // terminó hace rato), así que se avisa acá para no fallar en silencio.
  const [droppedPhotoMessage, setDroppedPhotoMessage] = useState<string>();
  const photoQueueRef = useRef<QueuedPhoto[]>([]);
  const flushingRef = useRef(false);
  const onPhotoSyncedRef = useRef(onPhotoSynced);
  const onAccessLostRef = useRef(onAccessLost);

  // Última versión de los callbacks para no tener que resuscribir `flush` en cada render de quien la usa.
  useEffect(() => {
    onPhotoSyncedRef.current = onPhotoSynced;
    onAccessLostRef.current = onAccessLost;
  });

  const refreshRetrying = useCallback(() => {
    setRetrying(loadPendingStopWrites().length > 0 || photoQueueRef.current.length > 0);
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      // Se confirma como mucho una vez por pasada (todo lo encolado es de la misma ruta): si ya se
      // supo que se perdió el acceso, no hace falta releer la ruta de nuevo por cada ítem que falle.
      let accessChecked = false;
      let accessLost = false;
      const isPermanentFailure = async () => {
        if (!accessChecked) {
          accessChecked = true;
          accessLost = !(await isRouteStillAccessible(supabase, routeId));
        }
        return accessLost;
      };

      for (const write of loadPendingStopWrites()) {
        try {
          await callChoferUpdateStop(supabase, write.routeStopId, write);
          removeStopWrite(write.id);
        } catch {
          if (await isPermanentFailure()) {
            // Rechazo permanente (ya no hay acceso a la ruta): reintentar para siempre no lo va a
            // arreglar, así que se descarta y se avisa (ver `onAccessLost` más abajo).
            removeStopWrite(write.id);
          }
          // Si no, sigue en la cola: se reintenta en el próximo disparo (online / pestaña visible).
        }
      }
      for (const queued of photoQueueRef.current) {
        try {
          const image = await uploadRouteStopImage(supabase, queued.input);
          photoQueueRef.current = photoQueueRef.current.filter((item) => item.id !== queued.id);
          onPhotoSyncedRef.current(queued.input.routeStopId, image);
        } catch (error) {
          const isPhotoLimit = error instanceof Error && error.message === PHOTO_LIMIT_MESSAGE;
          if (isPhotoLimit || (await isPermanentFailure())) {
            // Tope de 3 fotos ya alcanzado, o ruta ya sin acceso: ninguno de los dos se arregla
            // reintentando, así que se descarta. Si fue el tope, se avisa (la ruta ya sin acceso se
            // avisa aparte, vía `onAccessLost`, y cubre este caso también).
            photoQueueRef.current = photoQueueRef.current.filter((item) => item.id !== queued.id);
            if (isPhotoLimit) setDroppedPhotoMessage(PHOTO_LIMIT_MESSAGE);
          }
          // Ídem, si es transitorio queda en memoria para el próximo disparo.
        }
      }
      if (accessLost) onAccessLostRef.current();
    } finally {
      flushingRef.current = false;
      refreshRetrying();
    }
  }, [supabase, routeId, refreshRetrying]);

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

  const dismissDroppedPhotoMessage = useCallback(() => setDroppedPhotoMessage(undefined), []);

  return { retrying, droppedPhotoMessage, dismissDroppedPhotoMessage, persistStopWrite, uploadPhoto };
}
