import { useSyncExternalStore } from "react";

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

/** The slice of a `History` this hook reads — structural, so it binds to `@carapace/resources`'s
 *  `History` (or any compatible store) without a package dependency. */
export interface HistoryLike {
  subscribe: (fn: () => void) => () => void;
  readonly version: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/**
 * Subscribes a component to a `History` so it re-renders on every edit, returning undo/redo
 * availability for toolbar buttons. Reads from the live store each render (keyed on the monotonic
 * `version`), so it never holds a stale snapshot.
 */
export function useHistory(history: HistoryLike): HistoryState {
  useSyncExternalStore(history.subscribe, () => history.version, () => history.version);
  return { canUndo: history.canUndo, canRedo: history.canRedo };
}
