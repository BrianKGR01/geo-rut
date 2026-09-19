import { useEffect, useRef } from "react";

/**
 * Hace que el botón/gesto "atrás" del celular cierre la capa visible (hoja o diálogo) en vez de
 * salir de la app: cada capa abierta ocupa una entrada del historial del navegador.
 *
 * - Atrás del sistema → `popstate` → se cierra la capa de más arriba.
 * - Cierre desde la UI → se consume esa entrada con `history.go(-n)` (un solo salto por tanda,
 *   porque varios `history.back()` seguidos no son confiables entre navegadores).
 * - Si en el mismo instante se cierra una capa y se abre otra (pasos de un flujo), la entrada
 *   se reutiliza y no se toca el historial.
 */
interface Layer {
  close: () => void;
}

const LAYER_KEY = "rtLayer";
const stack: Layer[] = [];
let pendingBack = 0;
let ignorePops = 0;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

function onPopState() {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  stack.pop()?.close();
}

function staleDepth(): number {
  const state: unknown = window.history.state;
  if (typeof state !== "object" || state === null || !(LAYER_KEY in state)) return 0;
  const depth = state[LAYER_KEY];
  return typeof depth === "number" && depth > 0 ? depth : 0;
}

function ensureListening() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", onPopState);
  // Tras recargar con una hoja abierta quedan entradas huérfanas: se descartan para que
  // "atrás" no necesite toques de más.
  const depth = staleDepth();
  if (depth > 0) {
    ignorePops++;
    window.history.go(-depth);
  }
}

function flushPendingBack() {
  flushTimer = undefined;
  if (pendingBack === 0) return;
  const steps = pendingBack;
  pendingBack = 0;
  ignorePops++;
  window.history.go(-steps);
}

export function useBackLayer(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    ensureListening();
    const layer: Layer = { close: () => onCloseRef.current() };
    stack.push(layer);
    if (pendingBack > 0) {
      pendingBack--;
    } else {
      // Se conserva el estado interno de Next.js; si no, su router recarga la página al volver.
      window.history.pushState({ ...window.history.state, [LAYER_KEY]: stack.length }, "");
    }
    return () => {
      const index = stack.indexOf(layer);
      if (index === -1) return; // la cerró el botón atrás: su entrada ya se consumió
      stack.splice(index, 1);
      pendingBack++;
      flushTimer ??= setTimeout(flushPendingBack, 0);
    };
  }, []);
}
