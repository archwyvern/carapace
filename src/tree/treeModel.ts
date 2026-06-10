import type { FlatNode, TreeNode } from "./treeTypes";
import { isCollapsible } from "./treeTypes";

/**
 * Flatten a tree into a visible node list based on which nodes are expanded.
 * Collapsed nodes' children are omitted.
 */
export function flattenVisible<T>(roots: TreeNode<T>[], expanded: Set<string>): FlatNode<T>[] {
  const result: FlatNode<T>[] = [];

  function walk(nodes: TreeNode<T>[], depth: number, ancestors: number[]) {
    for (const node of nodes) {
      const collapsible = isCollapsible(node);
      const isExpanded = collapsible && expanded.has(node.id);
      const index = result.length;
      result.push({ node, depth, expanded: isExpanded, collapsible, ancestorIndices: [...ancestors] });
      if (isExpanded && node.children) {
        walk(node.children, depth + 1, [...ancestors, index]);
      }
    }
  }

  walk(roots, 0, []);
  return result;
}

/** Flat index of the parent of the node at `index`, or -1 if it's a root. */
export function findParentIndex<T>(flat: FlatNode<T>[], index: number): number {
  const target = flat[index];
  if (!target) return -1;
  const targetDepth = target.depth - 1;
  if (targetDepth < 0) return -1;
  for (let i = index - 1; i >= 0; i--) {
    if (flat[i]!.depth === targetDepth) return i;
  }
  return -1;
}

/** Flat index of the first child of the node at `index`, or -1 if leaf/collapsed. */
export function findFirstChildIndex<T>(flat: FlatNode<T>[], index: number): number {
  const node = flat[index];
  if (!node || !node.collapsible || !node.expanded) return -1;
  const next = flat[index + 1];
  return next && next.depth > node.depth ? index + 1 : -1;
}

/** Next visible index, wrapping at the end. */
export function findNextFocusable(length: number, current: number): number {
  if (length === 0) return -1;
  return (current + 1) % length;
}

/** Previous visible index, wrapping at the start. */
export function findPrevFocusable(length: number, current: number): number {
  if (length === 0) return -1;
  return (current - 1 + length) % length;
}
