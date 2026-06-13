import type { CSSProperties, MouseEvent, ReactNode } from "react";

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
  onSelectionChange?: (node: TreeNode<T> | null) => void;
  onContextMenu?: (node: TreeNode<T>, e: MouseEvent) => void;
  /** Right-click on empty tree area (not on any row). */
  onBackgroundContextMenu?: (e: MouseEvent) => void;
  rowStyle?: (ctx: TreeItemContext<T>) => CSSProperties;
  ariaLabel?: string;
  className?: string;
}
