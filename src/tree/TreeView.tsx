import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { TreeItemContext, TreeViewProps } from "./treeTypes";
import {
  findFirstChildIndex,
  findNextFocusable,
  findParentIndex,
  findPrevFocusable,
  flattenVisible,
} from "./treeModel";

/** Generic, content-agnostic tree. Drives any hierarchy via `renderItem`. */
export function TreeView<T>({
  roots,
  renderItem,
  defaultExpanded,
  expanded: controlledExpanded,
  onExpandedChange,
  rowHeight = 22,
  indent = 12,
  onActivate,
  onSelectionChange,
  onContextMenu,
  rowStyle,
  ariaLabel,
  className,
}: TreeViewProps<T>) {
  const isControlled = controlledExpanded !== undefined;
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    () => defaultExpanded ?? new Set(),
  );
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const flat = useMemo(() => flattenVisible(roots, expanded), [roots, expanded]);

  const commitExpanded = (next: Set<string>) => {
    if (!isControlled) setInternalExpanded(next);
    onExpandedChange?.(next);
  };
  const setExpand = (id: string, on: boolean) => {
    if (expanded.has(id) === on) return;
    const next = new Set(expanded);
    if (on) next.add(id);
    else next.delete(id);
    commitExpanded(next);
  };
  const toggle = (id: string) => setExpand(id, !expanded.has(id));

  const select = (index: number) => {
    const f = flat[index];
    if (!f) return;
    setFocusedIndex(index);
    setSelectedId(f.node.id);
    onSelectionChange?.(f.node);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (flat.length === 0) return;
    const current = Math.min(Math.max(focusedIndex, 0), flat.length - 1);
    const cur = flat[current]!;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        select(findNextFocusable(flat.length, current));
        break;
      case "ArrowUp":
        e.preventDefault();
        select(findPrevFocusable(flat.length, current));
        break;
      case "ArrowRight":
        e.preventDefault();
        if (cur.collapsible && !cur.expanded) setExpand(cur.node.id, true);
        else {
          const child = findFirstChildIndex(flat, current);
          if (child >= 0) select(child);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (cur.collapsible && cur.expanded) setExpand(cur.node.id, false);
        else {
          const parent = findParentIndex(flat, current);
          if (parent >= 0) select(parent);
        }
        break;
      case "Enter":
        e.preventDefault();
        onActivate?.(cur.node);
        break;
    }
  };

  return (
    <div
      role="tree"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={`min-h-0 overflow-auto outline-none ${className ?? ""}`}
    >
      {flat.map((f, i) => {
        const ctx: TreeItemContext<T> = {
          node: f.node,
          depth: f.depth,
          expanded: f.expanded,
          collapsible: f.collapsible,
          focused: i === focusedIndex,
          selected: f.node.id === selectedId,
        };
        return (
          <div
            key={f.node.id}
            role="treeitem"
            aria-expanded={f.collapsible ? f.expanded : undefined}
            aria-selected={ctx.selected}
            style={{ height: rowHeight, paddingLeft: f.depth * indent, ...(rowStyle?.(ctx) ?? {}) }}
            onClick={() => select(i)}
            onDoubleClick={() => onActivate?.(f.node)}
            onContextMenu={(e) => onContextMenu?.(f.node, e)}
            className={`flex cursor-pointer items-center gap-1 px-1 text-sm whitespace-nowrap ${
              ctx.selected ? "bg-accent text-accent-fg" : "text-fg hover:bg-surface-raised"
            }`}
          >
            {f.collapsible ? (
              <button
                type="button"
                aria-label={f.expanded ? "Collapse" : "Expand"}
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(f.node.id);
                }}
                className="flex w-4 shrink-0 items-center justify-center text-fg-mid"
              >
                {f.expanded ? "▾" : "▸"}
              </button>
            ) : (
              <span className="w-4 shrink-0" />
            )}
            <span className="min-w-0 flex-1 truncate">{renderItem(ctx)}</span>
          </div>
        );
      })}
    </div>
  );
}
