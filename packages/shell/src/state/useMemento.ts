import { useCallback, useEffect, useState } from "react";
import { useStateService } from "./StateContext";

// Persisted bag of UI prefs under `id`, merged over `defaults`. Backed by the ambient
// StateService (localStorage write-through + cross-component subscribe). Pass a null id
// for ephemeral (in-memory) state — useful when persistence is opt-in.
export function useMemento<T extends Record<string, unknown>>(
  id: string | null,
  defaults: T,
): { value: T; update: (partial: Partial<T>) => void } {
  const state = useStateService();
  const [value, setValue] = useState<T>(() =>
    id ? { ...defaults, ...state.get<Partial<T>>(id, {}) } : defaults,
  );

  useEffect(() => {
    if (!id) return;
    return state.subscribe(id, (raw) => {
      if (raw && typeof raw === "object") setValue((prev) => ({ ...prev, ...(raw as Partial<T>) }));
    });
  }, [state, id]);

  const update = useCallback((partial: Partial<T>) => {
    setValue((prev) => {
      const next = { ...prev, ...partial };
      if (id) state.set(id, next);
      return next;
    });
  }, [state, id]);

  return { value, update };
}
