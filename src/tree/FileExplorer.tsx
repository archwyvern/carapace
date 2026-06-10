import { useEffect, useState } from "react";
import { useHost } from "../host/context";
import { TreeView } from "./TreeView";
import type { TreeNode } from "./treeTypes";
import type { CarapaceHost, DirEntry } from "../host/types";

export interface FileExplorerProps {
  root: string;
  onOpen?: (path: string) => void;
  ariaLabel?: string;
}

/** Eagerly build the directory tree under `path` from the host fs. */
async function buildTree(fs: CarapaceHost["fs"], path: string): Promise<TreeNode<DirEntry>[]> {
  const entries = await fs.list(path);
  // Directories first, then alphabetical.
  entries.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  return Promise.all(
    entries.map(async (e) => ({
      id: e.path,
      data: e,
      children: e.isDir ? await buildTree(fs, e.path) : undefined,
    })),
  );
}

/** A file tree bound to the host filesystem. Reloads on fs changes. */
export function FileExplorer({ root, onOpen, ariaLabel = "Files" }: FileExplorerProps) {
  const host = useHost();
  const [roots, setRoots] = useState<TreeNode<DirEntry>[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const tree = await buildTree(host.fs, root);
      if (!cancelled) setRoots(tree);
    };
    void load();
    const unwatch = host.fs.watch(root, () => void load());
    return () => {
      cancelled = true;
      unwatch();
    };
  }, [host, root]);

  return (
    <TreeView
      roots={roots}
      ariaLabel={ariaLabel}
      onActivate={(node) => {
        if (!node.data.isDir) onOpen?.(node.data.path);
      }}
      renderItem={(ctx) => <span>{ctx.node.data.name}</span>}
    />
  );
}
