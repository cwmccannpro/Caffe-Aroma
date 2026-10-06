import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** false during server render and hydration, true afterwards. Avoids setState-in-effect for "client only" UI. */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
