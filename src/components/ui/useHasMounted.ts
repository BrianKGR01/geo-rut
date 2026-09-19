import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false en el servidor y durante la hidratación; true después. Evita desajustes con el estado persistido. */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
