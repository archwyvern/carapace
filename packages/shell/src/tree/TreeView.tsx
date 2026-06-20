import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import type { DropPosition, TreeItemContext, TreeNode, TreeViewProps } from "./treeTypes";
import {
  findFirstChildIndex,
  findNextFocusable,
  findParentIndex,
  findPrevFocusable,
  flattenVisible,
} from "./treeModel";

/** Generic, content-agnostic tree. Drives any hierarchy via `renderItem`.
 *  Supports VS Code-style multiselect (Ctrl/Cmd+click toggle, Shift+click range)
 *  and opt-in drag-and-drop (provide `canDrop` + `onDrop`). */
export function TreeView<T>({
  roots,
  renderItem,
  renderTrailing,
  defaultExpanded,
  expanded: controlledExpanded,
  onExpandedChange,
  rowHeight = 22,
  indent = 12,
  onActivate,
  selectedIds,
  onSelectionChange,
  onSelectedChange,
  canDrop,
  onDrop,
  reorder = false,
  onDelete,
  onRename,
  onExternalDrop,
  editingId,
  editingInitial,
  onEditCommit,
  onEditCancel,
  onContextMenu,
  onBackgroundContextMenu,
  rowStyle,
  ariaLabel,
  className,
}: TreeViewProps<T>) {
  const isControlled = controlledExpanded !== undefined;
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    () => defaultExpanded ?? new Set(),
  );
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const isSelControlled = selectedIds !== undefined;
  const [internalSelected, setInternalSelected] = useState<Set<string>>(() => new Set());
  const selected = isSelControlled ? selectedIds : internalSelected;
  const [anchor, setAnchor] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>("into");
  const [rootDrop, setRootDrop] = useState(false);
  const [treeFocused, setTreeFocused] = useState(false);
  const dragIds = useRef<string[]>([]);
  const expandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flat = useMemo(() => flattenVisible(roots, expanded), [roots, expanded]);
  const byId = useMemo(() => new Map(flat.map((f) => [f.node.id, f.node])), [flat]);

  const dndEnabled = !!(canDrop && onDrop);
  const dropEnabled = dndEnabled || !!onExternalDrop;
  const isExternal = () => dragIds.current.length === 0; // no internal drag in progress

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

  // Commit a selection: update state, move focus, and notify (primary + full set).
  const commitSelection = (ids: Set<string>, activeIndex: number, anchorIndex: number | null) => {
    if (!isSelControlled) setInternalSelected(ids);
    setFocusedIndex(activeIndex);
    setAnchor(anchorIndex);
    onSelectionChange?.(flat[activeIndex]?.node ?? null);
    onSelectedChange?.(flat.filter((f) => ids.has(f.node.id)).map((f) => f.node));
  };

  // Keyboard / programmatic single-select.
  const select = (index: number) => {
    const f = flat[index];
    if (!f) return;
    commitSelection(new Set([f.node.id]), index, index);
  };

  const handleClick = (index: number, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
    const id = flat[index]!.node.id;
    if (e.shiftKey && anchor !== null) {
      const lo = Math.min(anchor, index);
      const hi = Math.max(anchor, index);
      const ids = new Set(flat.slice(lo, hi + 1).map((f) => f.node.id));
      commitSelection(ids, index, anchor); // keep the existing anchor
    } else if (e.ctrlKey || e.metaKey) {
      const ids = new Set(selected);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      commitSelection(ids, index, index);
    } else {
      commitSelection(new Set([id]), index, index);
      // VS Code: a plain click on a folder row also toggles its expansion.
      const f = flat[index]!;
      if (f.collapsible) setExpand(f.node.id, !f.expanded);
    }
  };

  const selectionNodes = (focusedFallback: TreeNode<T>): TreeNode<T>[] =>
    selected.size > 0 ? flat.filter((f) => selected.has(f.node.id)).map((f) => f.node) : [focusedFallback];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (flat.length === 0) return;
    const current = Math.min(Math.max(focusedIndex, 0), flat.length - 1);
    const cur = flat[current]!;
    // Ctrl/Cmd+A selects every visible row.
    if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      commitSelection(new Set(flat.map((f) => f.node.id)), current, current);
      return;
    }
    switch (e.key) {
      case "Home":
        e.preventDefault();
        select(0);
        break;
      case "End":
        e.preventDefault();
        select(flat.length - 1);
        break;
      case "F2":
        if (onRename) {
          e.preventDefault();
          onRename(cur.node);
        }
        break;
      case "Delete":
        if (onDelete) {
          e.preventDefault();
          onDelete(selectionNodes(cur.node));
        }
        break;
      case "Backspace":
        if (onDelete && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onDelete(selectionNodes(cur.node));
        }
        break;
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

  // ── drag and drop ──
  const draggedNodes = (): TreeNode<T>[] =>
    dragIds.current.map((id) => byId.get(id)).filter((n): n is TreeNode<T> => !!n);

  const clearDrag = () => {
    if (expandTimer.current) clearTimeout(expandTimer.current);
    expandTimer.current = null;
    dragIds.current = [];
    setDropTargetId(null);
    setDropPosition("into");
    setRootDrop(false);
  };

  const handleDragStart = (index: number, e: DragEvent) => {
    const id = flat[index]!.node.id;
    // Dragging a selected row drags the whole selection; dragging an unselected row
    // selects it first, then drags just it.
    if (selected.has(id)) {
      dragIds.current = flat.filter((f) => selected.has(f.node.id)).map((f) => f.node.id);
    } else {
      dragIds.current = [id];
      commitSelection(new Set([id]), index, index);
    }
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", dragIds.current.join("\n"));
    } catch {
      /* some environments restrict setData; the in-memory ref is the source of truth */
    }
  };

  const hoverExpand = (node: TreeNode<T>) => {
    if (expandTimer.current) clearTimeout(expandTimer.current);
    if (node.children?.length && !expanded.has(node.id)) {
      expandTimer.current = setTimeout(() => setExpand(node.id, true), 500);
    }
  };

  const handleRowDragOver = (node: TreeNode<T>, e: DragEvent) => {
    if (isExternal()) {
      if (!onExternalDrop) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (dropTargetId !== node.id) { setDropTargetId(node.id); hoverExpand(node); }
      if (rootDrop) setRootDrop(false);
      return;
    }
    if (!dndEnabled || !canDrop!(draggedNodes(), node)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    let pos: DropPosition = "into";
    if (reorder) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      pos = y < rect.height * 0.25 ? "before" : y > rect.height * 0.75 ? "after" : "into";
      if (pos !== dropPosition) setDropPosition(pos);
    }
    if (dropTargetId !== node.id) {
      setDropTargetId(node.id);
      if (pos === "into") hoverExpand(node);
    }
    if (rootDrop) setRootDrop(false);
  };

  const handleRowDrop = (node: TreeNode<T>, e: DragEvent) => {
    if (isExternal()) {
      if (onExternalDrop) { e.preventDefault(); onExternalDrop(e, node); }
      clearDrag();
      return;
    }
    if (dndEnabled) {
      const dragged = draggedNodes();
      if (canDrop!(dragged, node)) {
        e.preventDefault();
        if (reorder) onDrop!(dragged, node, dropPosition);
        else onDrop!(dragged, node);
      }
    }
    clearDrag();
  };

  const handleContainerDragOver = (e: DragEvent) => {
    if (e.target !== e.currentTarget) return;
    if (isExternal()) {
      if (!onExternalDrop) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!rootDrop) setRootDrop(true);
      if (dropTargetId) setDropTargetId(null);
      return;
    }
    if (!dndEnabled || !canDrop!(draggedNodes(), null)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!rootDrop) setRootDrop(true);
    if (dropTargetId) setDropTargetId(null);
  };

  const handleContainerDrop = (e: DragEvent) => {
    if (e.target === e.currentTarget) {
      if (isExternal()) {
        if (onExternalDrop) { e.preventDefault(); onExternalDrop(e, null); }
      } else if (dndEnabled) {
        const dragged = draggedNodes();
        if (canDrop!(dragged, null)) { e.preventDefault(); onDrop!(dragged, null); }
      }
    }
    clearDrag();
  };

  return (
    <div
      role="tree"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onContextMenu={
        onBackgroundContextMenu
          ? (e) => {
              if (e.target === e.currentTarget) onBackgroundContextMenu(e);
            }
          : undefined
      }
      onDragOver={dropEnabled ? handleContainerDragOver : undefined}
      onDrop={dropEnabled ? handleContainerDrop : undefined}
      onDragEnd={dropEnabled ? clearDrag : undefined}
      onDragLeave={dropEnabled ? (e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setDropTargetId(null); setRootDrop(false); }
      } : undefined}
      onFocus={() => setTreeFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTreeFocused(false);
      }}
      className={`min-h-0 overflow-auto outline-none ${
        rootDrop ? "ring-1 ring-inset ring-accent" : ""
      } ${className ?? ""}`}
    >
      {flat.map((f, i) => {
        const isSel = selected.has(f.node.id);
        const isDrop = dropTargetId === f.node.id;
        const dropPos = isDrop ? (reorder ? dropPosition : "into") : null;
        const dropClass =
          dropPos === "into"
            ? "bg-accent/25 ring-1 ring-inset ring-accent"
            : dropPos === "before"
              ? "shadow-[inset_0_2px_0_0_var(--color-accent)]"
              : dropPos === "after"
                ? "shadow-[inset_0_-2px_0_0_var(--color-accent)]"
                : isSel
                  ? "bg-list-active text-fg"
                  : "text-fg hover:bg-surface-raised";
        const ctx: TreeItemContext<T> = {
          node: f.node,
          depth: f.depth,
          expanded: f.expanded,
          collapsible: f.collapsible,
          focused: i === focusedIndex,
          selected: isSel,
        };
        return (
          <div
            key={f.node.id}
            role="treeitem"
            aria-expanded={f.collapsible ? f.expanded : undefined}
            aria-selected={isSel}
            draggable={dndEnabled}
            onDragStart={dndEnabled ? (e) => handleDragStart(i, e) : undefined}
            onDragOver={dropEnabled ? (e) => handleRowDragOver(f.node, e) : undefined}
            onDrop={dropEnabled ? (e) => handleRowDrop(f.node, e) : undefined}
            style={{ height: rowHeight, paddingLeft: f.depth * indent, ...(rowStyle?.(ctx) ?? {}) }}
            onClick={(e) => handleClick(i, e)}
            onDoubleClick={() => onActivate?.(f.node)}
            onContextMenu={(e) => {
              if (!isSel) commitSelection(new Set([f.node.id]), i, i);
              onContextMenu?.(f.node, e);
            }}
            className={`group flex cursor-pointer items-center gap-1 px-1 text-sm whitespace-nowrap ${dropClass} ${treeFocused && ctx.focused && !isDrop ? "ring-1 ring-inset ring-accent/50" : ""}`}
          >
            {f.collapsible ? (
              <button
                type="button"
                aria-label={f.expanded ? "Collapse" : "Expand"}
                tabIndex={-1}
                draggable={false}
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
            {f.node.id === editingId ? (
              <TreeEditInput initial={editingInitial ?? ""} onCommit={onEditCommit} onCancel={onEditCancel} />
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate">{renderItem(ctx)}</span>
                {renderTrailing && <span className="shrink-0">{renderTrailing(ctx)}</span>}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** In-tree text field for inline rename / new-item, seeded with `initial`. Commits on
 *  Enter or blur, cancels on Escape; files pre-select the basename (before the extension). */
function TreeEditInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit?: (value: string) => void;
  onCancel?: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initial);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = initial.lastIndexOf(".");
    if (dot > 0) el.setSelectionRange(0, dot);
    else el.select();
  }, [initial]);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    onCommit?.(value);
  };
  const cancel = () => {
    if (done.current) return;
    done.current = true;
    onCancel?.();
  };

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
      }}
      onBlur={commit}
      spellCheck={false}
      autoComplete="off"
      className="min-w-0 flex-1 rounded-sm border border-accent bg-surface-sunken px-1 text-sm text-fg outline-none"
    />
  );
}
