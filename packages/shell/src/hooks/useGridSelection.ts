import { useCallback, useRef, useState } from "react";

export interface GridSelectionMods {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export interface GridSelection {
  selected: Set<string>;
  isSelected: (id: string) => boolean;
  /** Apply a click with modifiers: plain = single, Ctrl/Cmd = toggle, Shift = range from anchor. */
  onItemClick: (id: string, mods?: GridSelectionMods) => void;
  /** Replace the whole selection. */
  set: (ids: Iterable<string>) => void;
  selectAll: () => void;
  clear: () => void;
}

export interface GridSelectionOptions {
  /** Controlled selection (pair with onChange). */
  selected?: Set<string>;
  onChange?: (selected: Set<string>) => void;
}

/**
 * VS Code-style multi-selection model for a flat, ordered list of ids (grids, lists,
 * thumbnail walls). Mirrors TreeView's selection semantics — plain click = single,
 * Ctrl/Cmd-click = toggle, Shift-click = range from the anchor. Controlled or uncontrolled.
 * Wire `onItemClick(id, e)` from each item and `isSelected(id)` for styling.
 */
export function useGridSelection(ids: string[], opts: GridSelectionOptions = {}): GridSelection {
  const { selected: controlledSelected, onChange } = opts;
  const controlled = controlledSelected !== undefined;
  const [internal, setInternal] = useState<Set<string>>(() => new Set());
  const selected = controlled ? controlledSelected : internal;
  const anchor = useRef<string | null>(null);

  const commit = useCallback(
    (next: Set<string>) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );

  const onItemClick = useCallback(
    (id: string, mods: GridSelectionMods = {}) => {
      if (mods.shiftKey && anchor.current) {
        const a = ids.indexOf(anchor.current);
        const b = ids.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          commit(new Set(ids.slice(lo, hi + 1)));
          return;
        }
      }
      if (mods.ctrlKey || mods.metaKey) {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        anchor.current = id;
        commit(next);
        return;
      }
      anchor.current = id;
      commit(new Set([id]));
    },
    [ids, selected, commit],
  );

  const set = useCallback((x: Iterable<string>) => commit(new Set(x)), [commit]);
  const selectAll = useCallback(() => commit(new Set(ids)), [ids, commit]);
  const clear = useCallback(() => commit(new Set()), [commit]);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return { selected, isSelected, onItemClick, set, selectAll, clear };
}
