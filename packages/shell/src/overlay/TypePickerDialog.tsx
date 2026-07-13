import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "./Modal";

/** One node in a type-picker tree. Purely structural — the caller supplies rendered icons and
 *  descriptions, so this component stays decoupled from any engine's type model. */
export interface TypePickerItem {
  /** Stable identity, returned by `onPick`. Usually the type name. */
  id: string;
  label: string;
  /** Rendered icon element (16px-ish); the caller owns the icon vocabulary. */
  icon?: ReactNode;
  /** Shown in the description panel when this row is highlighted. */
  description?: ReactNode;
  /** Whether the row can be chosen. Abstract/grouping rows pass `false`: shown, not pickable.
   *  Defaults to `true`. */
  selectable?: boolean;
  children?: TypePickerItem[];
}

export interface TypePickerDialogProps {
  open: boolean;
  /** Dialog heading, e.g. "Create New Resource" / "Pick Node Type". */
  title: string;
  /** Root items (a single root, or a forest). */
  roots: TypePickerItem[];
  onPick: (id: string) => void;
  onClose: () => void;
  /** Primary-button label. Defaults to "Create". */
  confirmLabel?: string;
  placeholder?: string;
}

interface Row {
  item: TypePickerItem;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

const hasKids = (item: TypePickerItem): boolean => (item.children?.length ?? 0) > 0;

/** True when the item, or any descendant, matches the query. */
function subtreeMatches(item: TypePickerItem, q: string): boolean {
  if (item.label.toLowerCase().includes(q)) return true;
  return (item.children ?? []).some((c) => subtreeMatches(c, q));
}

/** Depth-first visible rows: under a query, everything on a matching path shows and is expanded;
 *  otherwise expansion follows the `expanded` set. */
function flatten(
  roots: TypePickerItem[],
  q: string,
  expanded: ReadonlySet<string>,
  out: Row[] = [],
  depth = 0,
): Row[] {
  for (const item of roots) {
    if (q && !subtreeMatches(item, q)) continue;
    const kids = hasKids(item);
    const isExpanded = q ? true : expanded.has(item.id);
    out.push({ item, depth, hasChildren: kids, expanded: isExpanded });
    if (kids && isExpanded) {
      flatten(item.children!, q, expanded, out, depth + 1);
    }
  }
  return out;
}

function collectExpandable(roots: TypePickerItem[], into: Set<string>): Set<string> {
  for (const item of roots) {
    if (hasKids(item)) {
      into.add(item.id);
      collectExpandable(item.children!, into);
    }
  }
  return into;
}

/**
 * Godot-style type picker: a searchable inheritance tree with per-type icons and a description
 * panel. Non-selectable rows (abstract bases) render greyed and cannot be chosen. Keyboard: Up/Down
 * move the highlight, Left/Right collapse/expand, Enter picks a selectable row, Escape closes.
 */
export function TypePickerDialog({
  open,
  title,
  roots,
  onPick,
  onClose,
  confirmLabel = "Create",
  placeholder = "Search…",
}: TypePickerDialogProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => collectExpandable(roots, new Set()));
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fully expand on open; reset the query.
  useEffect(() => {
    if (open) {
      setQuery("");
      setExpanded(collectExpandable(roots, new Set()));
      setHighlightId(null);
    }
  }, [open, roots]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => flatten(roots, q, expanded), [roots, q, expanded]);

  // Keep a valid highlight: prefer the current one if still visible, else the first selectable row.
  const highlight = useMemo(() => {
    if (highlightId && rows.some((r) => r.item.id === highlightId)) return highlightId;
    return rows.find((r) => r.item.selectable !== false)?.item.id ?? rows[0]?.item.id ?? null;
  }, [rows, highlightId]);

  if (!open) return null;

  const highlightIndex = rows.findIndex((r) => r.item.id === highlight);
  const highlightRow = rows[highlightIndex];

  const move = (delta: number) => {
    if (rows.length === 0) return;
    let i = highlightIndex;
    for (let step = 0; step < rows.length; step++) {
      i = (i + delta + rows.length) % rows.length;
      // Land on selectable rows when possible; fall back to any row.
      if (rows[i]!.item.selectable !== false) break;
    }
    setHighlightId(rows[i]!.item.id);
  };

  const setExpand = (id: string, want: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (want) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const pick = (id: string) => {
    const row = rows.find((r) => r.item.id === id);
    if (row && row.item.selectable !== false) {
      onPick(id);
      onClose();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "ArrowRight") {
      if (highlightRow?.hasChildren && !highlightRow.expanded) {
        e.preventDefault();
        setExpand(highlightRow.item.id, true);
      }
    } else if (e.key === "ArrowLeft") {
      if (highlightRow?.hasChildren && highlightRow.expanded) {
        e.preventDefault();
        setExpand(highlightRow.item.id, false);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight) pick(highlight);
    }
  };

  const canConfirm = highlightRow?.item.selectable !== false && highlightRow !== undefined;

  return (
    <Modal
      title={title}
      onClose={onClose}
      initialFocus={searchRef}
      className="flex h-[70vh] max-h-[720px] w-[40rem] max-w-[92vw] flex-col border border-border bg-surface-raised p-4 outline-none"
    >
      <input
        ref={searchRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlightId(null);
        }}
        onKeyDown={onKeyDown}
        className="mb-2 w-full rounded-control border border-border bg-surface-sunken px-3 py-2 text-base text-fg shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] outline-none focus:border-accent"
      />

      <ul role="listbox" aria-label={title} className="min-h-0 flex-1 overflow-auto border border-border bg-surface-sunken py-1">
        {rows.length === 0 && <li className="px-3 py-2 text-base text-fg-mid">No matching types</li>}
        {rows.map((row) => {
          const selectable = row.item.selectable !== false;
          const active = row.item.id === highlight;
          return (
            <li key={row.item.id}>
              <div
                role="option"
                aria-selected={active}
                aria-disabled={!selectable}
                onMouseEnter={() => setHighlightId(row.item.id)}
                onClick={() => (row.hasChildren ? setExpand(row.item.id, !row.expanded) : undefined)}
                onDoubleClick={() => pick(row.item.id)}
                className={`flex cursor-default select-none items-center gap-1 py-[3px] pr-2 text-base ${
                  active ? "bg-accent text-accent-fg" : selectable ? "text-fg" : "text-fg-mid"
                }`}
                style={{ paddingLeft: `${row.depth * 14 + 6}px` }}
              >
                <span
                  className="flex w-4 shrink-0 justify-center"
                  onClick={(e) => {
                    if (!row.hasChildren) return;
                    e.stopPropagation();
                    setExpand(row.item.id, !row.expanded);
                  }}
                >
                  {row.hasChildren ? (row.expanded ? "▾" : "▸") : ""}
                </span>
                <span className="flex w-4 shrink-0 items-center justify-center">{row.item.icon}</span>
                <span className={`flex-1 truncate ${selectable ? "" : "italic"}`}>{row.item.label}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 h-16 shrink-0 overflow-auto border border-border bg-surface-sunken px-3 py-2 text-base text-fg-mid">
        {highlightRow ? (
          <>
            <span className="font-semibold text-fg">{highlightRow.item.label}</span>
            {highlightRow.item.description && <span> — {highlightRow.item.description}</span>}
          </>
        ) : null}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-control border border-border bg-surface-sunken px-3 py-1.5 text-base text-fg hover:border-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => highlight && pick(highlight)}
          className="rounded-control bg-accent px-3 py-1.5 text-base text-accent-fg disabled:opacity-40"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
