import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useHost } from "../host/context";
import { useOptionalConfirm } from "../overlay/confirm";
import { PromptDialog } from "../overlay/PromptDialog";
import { ContextMenu, useContextMenu } from "../menu/ContextMenu";
import type { MenuItem } from "../menu/model";
import { TreeView } from "./TreeView";
import type { TreeNode } from "./treeTypes";
import type { CarapaceHost, DirEntry } from "../host/types";

type Fs = NonNullable<CarapaceHost["fs"]>;

export interface FileExplorerProps {
  root: string;
  /** Activate (Enter / double-click) a file. */
  onOpen?: (path: string) => void;
  /** Leading icon for an entry (e.g. a file-type glyph). Consumer-supplied. */
  getIcon?: (entry: DirEntry) => ReactNode;
  /** Extra context-menu items appended for an entry (e.g. "Open in Text Editor"). */
  extraMenuItems?: (entry: DirEntry) => MenuItem[];
  /**
   * Omit matching entries from the tree entirely. Returning true drops the entry and,
   * for a directory, stops the walk descending into it — keeps the eager tree tractable
   * against real projects (node_modules, bin, obj, .git).
   */
  exclude?: (entry: DirEntry) => boolean;
  /** Show dot-files. Default false. */
  showHidden?: boolean;
  ariaLabel?: string;
}

/**
 * A file tree bound to the host filesystem: open, create, rename, delete, and a
 * context menu — all routed through `host.fs`. Renders disabled when the host
 * provides no `fs` adapter (e.g. the browser). Icons, the open action, and any
 * extra menu items are consumer-supplied so the component stays domain-agnostic.
 * TreeView remains the generic primitive; FileExplorer builds on it.
 */
export function FileExplorer(props: FileExplorerProps) {
  const host = useHost();
  if (!host.fs) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-fg-mid">
        No filesystem available.
      </div>
    );
  }
  return <ActiveFileExplorer {...props} fs={host.fs} clipboard={host.clipboard} />;
}

type Exclude = (entry: DirEntry) => boolean;

async function buildTree(fs: Fs, path: string, showHidden: boolean, exclude?: Exclude): Promise<TreeNode<DirEntry>[]> {
  const entries = await fs.list(path);
  entries.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
  const visible = entries.filter((e) => (showHidden || !e.name.startsWith(".")) && !exclude?.(e));
  return Promise.all(
    visible.map(async (e) => ({
      id: e.path,
      data: e,
      children: e.isDir ? await buildTree(fs, e.path, showHidden, exclude) : undefined,
    })),
  );
}

/** Map each entry's path to its parent directory path, derived from the built tree. */
function indexParents(roots: TreeNode<DirEntry>[], rootPath: string): Map<string, string> {
  const parents = new Map<string, string>();
  const walk = (nodes: TreeNode<DirEntry>[], parent: string) => {
    for (const n of nodes) {
      parents.set(n.data.path, parent);
      if (n.children) walk(n.children, n.data.path);
    }
  };
  walk(roots, rootPath);
  return parents;
}

function joinPath(dir: string, name: string): string {
  return dir.endsWith("/") ? dir + name : `${dir}/${name}`;
}

type DialogState =
  | { kind: "newFile"; dir: string }
  | { kind: "newFolder"; dir: string }
  | { kind: "rename"; target: string; dir: string; initial: string };

interface ActiveProps extends FileExplorerProps {
  fs: Fs;
  clipboard: CarapaceHost["clipboard"];
}

function ActiveFileExplorer({
  root, onOpen, getIcon, extraMenuItems, exclude, showHidden = false, ariaLabel = "Files", fs, clipboard,
}: ActiveProps) {
  const confirm = useOptionalConfirm();
  const ctx = useContextMenu();
  const [roots, setRoots] = useState<TreeNode<DirEntry>[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const parents = useRef<Map<string, string>>(new Map());

  const reload = useCallback(async () => {
    const tree = await buildTree(fs, root, showHidden, exclude);
    parents.current = indexParents(tree, root);
    setRoots(tree);
  }, [fs, root, showHidden, exclude]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      try {
        const tree = await buildTree(fs, root, showHidden, exclude);
        if (cancelled) return;
        parents.current = indexParents(tree, root);
        setRoots(tree);
      } catch {
        // Root unreadable (e.g. no project open yet, or a transient mount race) —
        // show an empty tree rather than throwing an unhandled rejection. A later
        // fs event re-runs this.
        if (!cancelled) setRoots([]);
      }
    };
    void run();
    // Coalesce bursts of fs events (a build, a git checkout) into one rebuild.
    const unwatch = fs.watch(root, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void run(), 200);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unwatch();
    };
  }, [fs, root, showHidden, exclude]);

  const remove = useCallback(async (entry: DirEntry) => {
    if (confirm) {
      const kind = entry.isDir ? "folder" : "file";
      const result = await confirm({
        title: `Delete ${kind}?`,
        message: `"${entry.name}" will be deleted.`,
        confirmLabel: "Delete",
        danger: true,
      });
      if (result !== "confirm") return;
    }
    await fs.delete(entry.path);
    void reload();
  }, [confirm, fs, reload]);

  const buildMenu = useCallback((entry: DirEntry): MenuItem[] => {
    const items: MenuItem[] = [];
    if (entry.isDir) {
      items.push({ id: "newFile", label: "New File…", run: () => setDialog({ kind: "newFile", dir: entry.path }) });
      items.push({ id: "newFolder", label: "New Folder…", run: () => setDialog({ kind: "newFolder", dir: entry.path }) });
    }
    const extra = extraMenuItems?.(entry) ?? [];
    if (extra.length) items.push(...extra);
    if (entry.path !== root) {
      if (items.length) items.push({ separator: true });
      const dir = parents.current.get(entry.path) ?? root;
      items.push({ id: "rename", label: "Rename…", run: () => setDialog({ kind: "rename", target: entry.path, dir, initial: entry.name }) });
      items.push({ id: "delete", label: "Delete", run: () => void remove(entry) });
      items.push({ separator: true });
      items.push({ id: "copyPath", label: "Copy Path", run: () => void clipboard.writeText(entry.path) });
    }
    return items;
  }, [extraMenuItems, root, clipboard, remove]);

  const openRootMenu = useCallback((e: ReactMouseEvent) => {
    setMenuItems([
      { id: "newFile", label: "New File…", run: () => setDialog({ kind: "newFile", dir: root }) },
      { id: "newFolder", label: "New Folder…", run: () => setDialog({ kind: "newFolder", dir: root }) },
    ]);
    ctx.open(e);
  }, [root, ctx]);

  const submitDialog = useCallback(async (name: string) => {
    const d = dialog;
    setDialog(null);
    const trimmed = name.trim();
    if (!d || !trimmed) return;
    if (d.kind === "newFile") await fs.createFile(joinPath(d.dir, trimmed), "");
    else if (d.kind === "newFolder") await fs.createDir(joinPath(d.dir, trimmed));
    else await fs.rename(d.target, joinPath(d.dir, trimmed));
    void reload();
  }, [dialog, fs, reload]);

  return (
    <>
      <TreeView
        roots={roots}
        ariaLabel={ariaLabel}
        expanded={expanded}
        onExpandedChange={setExpanded}
        onActivate={(node) => {
          if (!node.data.isDir) onOpen?.(node.data.path);
        }}
        onContextMenu={(node, e) => {
          setMenuItems(buildMenu(node.data));
          ctx.open(e);
        }}
        onBackgroundContextMenu={openRootMenu}
        renderItem={(c) => (
          <span className="flex items-center gap-1.5">
            {getIcon?.(c.node.data)}
            <span className="truncate">{c.node.data.name}</span>
          </span>
        )}
      />
      {ctx.state && <ContextMenu items={menuItems} x={ctx.state.x} y={ctx.state.y} onClose={ctx.close} />}
      {dialog && (
        <PromptDialog
          title={dialog.kind === "rename" ? "Rename" : dialog.kind === "newFolder" ? "New Folder" : "New File"}
          message="Name:"
          initialValue={dialog.kind === "rename" ? dialog.initial : ""}
          onConfirm={(v) => void submitDialog(v)}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
}
