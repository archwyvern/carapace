import type { CSSProperties, DragEvent, MouseEvent, ReactNode } from "react";

/** A node in the tree, generic over the user data type T. */
export interface TreeNode<T = unknown> {
  id: string;
  data: T;
  /** Child nodes. Undefined or empty = leaf. */
  children?: TreeNode<T>[];
}

/** True if the node has children (is collapsible). */
export function isCollapsible<T>(node: TreeNode<T>): boolean {
  return !!node.children && node.children.length > 0;
}

/** A node in the flattened visible list, annotated with depth and state. */
export interface FlatNode<T = unknown> {
  node: TreeNode<T>;
  depth: number;
  expanded: boolean;
  collapsible: boolean;
  /** Indices of ancestor nodes in the flat list. */
  ancestorIndices: number[];
}

/** Where a drag would land relative to the target row: as a sibling before/after
 *  it, or as a child dropped onto ("into") it. */
export type DropPosition = "before" | "into" | "after";

/** Context passed to the renderer for each tree item. */
export interface TreeItemContext<T = unknown> {
  node: TreeNode<T>;
  depth: number;
  expanded: boolean;
  collapsible: boolean;
  focused: boolean;
  selected: boolean;
}

export interface TreeViewProps<T = unknown> {
  roots: TreeNode<T>[];
  /** Render the content of a row (after the twistie + indent). */
  renderItem: (ctx: TreeItemContext<T>) => ReactNode;
  /** Render right-aligned trailing content per row (e.g. hover actions, badges). The
   *  row carries a `group` class, so `group-hover:` reveals hover-only actions. */
  renderTrailing?: (ctx: TreeItemContext<T>) => ReactNode;
  /** Initially expanded ids (uncontrolled). */
  defaultExpanded?: Set<string>;
  /** Controlled expanded state. When set, TreeView does not manage it internally. */
  expanded?: Set<string>;
  onExpandedChange?: (expanded: Set<string>) => void;
  /** Row height in px. Default 22. */
  rowHeight?: number;
  /** Indent per level in px. Default 12. */
  indent?: number;
  /** Activated via Enter or double-click. */
  onActivate?: (node: TreeNode<T>) => void;
  /** Controlled selection by node id. When set, TreeView reflects it instead of
   *  managing selection internally — for syncing selection with another view
   *  (e.g. a canvas). Pair with onSelectionChange/onSelectedChange to write back. */
  selectedIds?: Set<string>;
  /** The primary (last-clicked) node of the selection. Fires on every selection change. */
  onSelectionChange?: (node: TreeNode<T> | null) => void;
  /** The full multi-selection. Plain click = single; Ctrl/Cmd+click toggles; Shift+click ranges. */
  onSelectedChange?: (nodes: TreeNode<T>[]) => void;
  /**
   * Enable drag-and-drop. Return whether the dragged nodes may drop onto `target`
   * (a null target means the tree background / root). Providing this together with
   * onDrop makes rows draggable; omitting it disables DnD.
   */
  canDrop?: (dragged: TreeNode<T>[], target: TreeNode<T> | null) => boolean;
  /** Perform the move when nodes are dropped on `target` (null = background/root).
   *  With `reorder`, `position` says whether the drop is before/into/after the
   *  target; without it, drops are always "into" and `position` is omitted. */
  onDrop?: (dragged: TreeNode<T>[], target: TreeNode<T> | null, position?: DropPosition) => void;
  /** Opt in to positional (reorder) drops: the top/bottom quarters of a row drop
   *  before/after it (as a sibling) and the middle drops into it (as a child),
   *  with a drop-line indicator. Default false = whole-row "into" only. */
  reorder?: boolean;
  /** When true, a plain click on an already-selected collapsible row toggles its
   *  expansion; a click on an unselected row only selects it (re-click, or the
   *  twistie, to expand). Default false = a plain click always toggles (the
   *  file-explorer / VS Code convention). Use for trees where selecting and
   *  expanding are distinct intents — e.g. a layer tree. */
  expandOnReselect?: boolean;
  /** When false, a plain row click NEVER toggles expansion — only the twistie does
   *  (Godot scene-tree convention: rows are for selecting, the chevron is for folding).
   *  Default true (the file-explorer convention). Overrides `expandOnReselect`. */
  expandOnRowClick?: boolean;
  /** A drop from OUTSIDE the tree (no internal drag in progress) — e.g. dragging an
   *  item in from another view. Fires with the native event (read its dataTransfer) and
   *  the target node (null = background/root). Providing this makes rows accept external
   *  drags. */
  onExternalDrop?: (e: DragEvent, target: TreeNode<T> | null) => void;
  /** Delete key: fires with the current multi-selection. */
  onDelete?: (nodes: TreeNode<T>[]) => void;
  /** F2: fires with the focused node (consumer starts a rename). */
  onRename?: (node: TreeNode<T>) => void;
  /** Id of the row currently being edited in-place (inline rename / new item). */
  editingId?: string;
  /** Seed text for the inline editor (e.g. the current filename). */
  editingInitial?: string;
  /** Inline edit committed (Enter or blur) with the entered text. */
  onEditCommit?: (value: string) => void;
  /** Inline edit cancelled (Escape). */
  onEditCancel?: () => void;
  onContextMenu?: (node: TreeNode<T>, e: MouseEvent) => void;
  /** Right-click on empty tree area (not on any row). */
  onBackgroundContextMenu?: (e: MouseEvent) => void;
  /** Programmatic reveal: when `seq` bumps, single-select the node and scroll its row into view.
   *  The node must be VISIBLE — expand its ancestors (via `expanded`) in the same update. */
  reveal?: { id: string; seq: number };
  /** Ignore arrow keys entirely — no focus/selection navigation, no expand/collapse,
   *  and no preventDefault, so the keydown bubbles to the host. For trees living
   *  next to a view that owns the arrows (e.g. a canvas nudging the selection).
   *  Other keyboard verbs (Home/End/Enter/Delete/F2/Ctrl+A) keep working. */
  disableArrowKeys?: boolean;
  rowStyle?: (ctx: TreeItemContext<T>) => CSSProperties;
  ariaLabel?: string;
  className?: string;
}
