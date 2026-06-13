import type { TreeNode } from "./treeTypes";

/**
 * Filter a tree by a query string: keep every node that matches (with its full
 * subtree) plus the ancestor chain leading to any match. Pass the result as
 * `roots` to a TreeView. Empty/blank query returns the original roots unchanged.
 */
export function treeFilter<T>(
  roots: TreeNode<T>[],
  query: string,
  getText: (node: TreeNode<T>) => string,
): TreeNode<T>[] {
  const q = query.trim().toLowerCase();
  if (!q) return roots;

  const walk = (nodes: TreeNode<T>[]): TreeNode<T>[] => {
    const out: TreeNode<T>[] = [];
    for (const node of nodes) {
      const selfMatch = getText(node).toLowerCase().includes(q);
      const kids = node.children ? walk(node.children) : [];
      if (selfMatch) out.push(node);
      else if (kids.length > 0) out.push({ ...node, children: kids });
    }
    return out;
  };

  return walk(roots);
}
