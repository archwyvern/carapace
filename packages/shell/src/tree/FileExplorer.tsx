import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useHost } from "../host/context";
import { useOptionalConfirm } from "../overlay/confirm";
import { ContextMenu, useContextMenu } from "../menu/ContextMenu";
import type { MenuItem } from "../menu/model";
import { useMemento } from "../state/useMemento";
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
  /** Right-aligned per-row actions (e.g. a hover play button). The row carries `group`,
   *  so `group-hover:` can reveal hover-only actions. */
  rowActions?: (entry: DirEntry) => ReactNode;
  /** A drop from outside the explorer (e.g. dragging an item in from another view).
   *  Fires with the drag's dataTransfer and the resolved destination folder (absolute;
   *  a folder target IS the dest, a file target means its parent, background = root). */
  onExternalDrop?: (dataTransfer: DataTransfer, targetDir: string) => void;
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
  /** Persist expanded-folder state across reloads under this memento id (via the
   *  ambient StateService — localStorage by default, or the app's injected backend).
   *  Scope it per project. Omit for ephemeral expansion. */
  storageKey?: string;
  /**
   * Boilerplate for the "New File" action: force an extension, seed the file with
   * `content`, and label the action (e.g. { extension: ".sfx", content: TEMPLATE,
   * label: "Sound" } → "New Sound…" creating `name.sfx` pre-filled). Newly created
   * files open via `onOpen`.
   */
  newFile?: { extension?: string; content?: string; label?: string };
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
      <div className="flex h-full items-center justify-center p-4 text-center text-base text-fg-mid">
        No filesystem available.
      </div>
    );
  }
  return <ActiveFileExplorer {...props} fs={host.fs} clipboard={host.clipboard} os={host.os} />;
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

/** Map each entry's path to its DirEntry (for copy, which needs the isDir flag). */
function indexEntries(roots: TreeNode<DirEntry>[]): Map<string, DirEntry> {
  const map = new Map<string, DirEntry>();
  const walk = (nodes: TreeNode<DirEntry>[]) => {
    for (const n of nodes) {
      map.set(n.data.path, n.data);
      if (n.children) walk(n.children);
    }
  };
  walk(roots);
  return map;
}

function baseExt(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
}

function joinPath(dir: string, name: string): string {
  return dir.endsWith("/") ? dir + name : `${dir}/${name}`;
}

// Sentinel id for the phantom row shown while typing a new file/folder name in-tree.
const NEW_ID = "__carapace_new__";

type Editing =
  | { kind: "newFile"; dir: string }
  | { kind: "newFolder"; dir: string }
  | { kind: "rename"; target: string; dir: string; initial: string };

interface ActiveProps extends FileExplorerProps {
  fs: Fs;
  clipboard: CarapaceHost["clipboard"];
  os: CarapaceHost["os"];
}

function ActiveFileExplorer({
  root, onOpen, getIcon, rowActions, onExternalDrop, extraMenuItems, exclude, showHidden = false, newFile, storageKey, ariaLabel = "Files", fs, clipboard, os,
}: ActiveProps) {
  const confirm = useOptionalConfirm();
  const ctx = useContextMenu();
  const [roots, setRoots] = useState<TreeNode<DirEntry>[]>([]);
  // Expanded-folder state persists via the memento StateService when storageKey is set
  // (ephemeral otherwise). Stored as a string[] bag the consumer's StateService owns.
  const expandedMemento = useMemento<{ expanded: string[] }>(storageKey ?? null, { expanded: [] });
  const expanded = useMemo(() => new Set(expandedMemento.value.expanded), [expandedMemento.value.expanded]);
  const setExpanded = useCallback((next: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    const value = typeof next === "function" ? next(expanded) : next;
    expandedMemento.update({ expanded: [...value] });
  }, [expandedMemento, expanded]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [selected, setSelected] = useState<DirEntry[]>([]);
  const [active, setActive] = useState<DirEntry | null>(null);
  const [clip, setClip] = useState<{ paths: string[]; cut: boolean } | null>(null);
  const parents = useRef<Map<string, string>>(new Map());
  const entries = useRef<Map<string, DirEntry>>(new Map());

  // While creating, splice a phantom row (the inline editor) under the target dir.
  const displayRoots = useMemo<TreeNode<DirEntry>[]>(() => {
    if (!editing || editing.kind === "rename") return roots;
    const phantom: TreeNode<DirEntry> = {
      id: NEW_ID,
      data: { name: "", path: joinPath(editing.dir, NEW_ID), isDir: editing.kind === "newFolder" },
      children: editing.kind === "newFolder" ? [] : undefined,
    };
    if (editing.dir === root) return [phantom, ...roots];
    const insert = (nodes: TreeNode<DirEntry>[]): TreeNode<DirEntry>[] =>
      nodes.map((n) =>
        n.data.path === editing.dir
          ? { ...n, children: [phantom, ...(n.children ?? [])] }
          : n.children ? { ...n, children: insert(n.children) } : n,
      );
    return insert(roots);
  }, [roots, editing, root]);

  const reload = useCallback(async () => {
    const tree = await buildTree(fs, root, showHidden, exclude);
    parents.current = indexParents(tree, root);
    entries.current = indexEntries(tree);
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
        entries.current = indexEntries(tree);
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

  const removeMany = useCallback(async (entries: DirEntry[]) => {
    if (entries.length === 0) return;
    if (confirm) {
      const one = entries[0]!;
      const result = await confirm({
        title: entries.length === 1 ? `Delete ${one.isDir ? "folder" : "file"}?` : `Delete ${entries.length} items?`,
        message: entries.length === 1 ? `"${one.name}" will be deleted.` : `${entries.length} items will be deleted.`,
        confirmLabel: "Delete",
        danger: true,
        defaultConfirm: true, // focus Delete so the keyboard flow is Del -> Enter
      });
      if (result !== "confirm") return;
    }
    for (const e of entries) {
      try { await fs.delete(e.path); } catch { /* already gone or in use; skip */ }
    }
    void reload();
  }, [confirm, fs, reload]);

  // Destination folder for a drop: a folder target IS the dest; a file target means its
  // parent folder (VS Code drops a file beside the one you released on); null = root.
  const destDirOf = useCallback((target: TreeNode<DirEntry> | null): string => {
    if (!target) return root;
    return target.data.isDir ? target.data.path : (parents.current.get(target.data.path) ?? root);
  }, [root]);

  // Whether `dragged` may move onto `target`. Excludes dropping onto itself, into its
  // own descendant, or where it already lives (no-op).
  const canDrop = useCallback((dragged: TreeNode<DirEntry>[], target: TreeNode<DirEntry> | null): boolean => {
    const destPath = destDirOf(target);
    return dragged.some((n) => {
      const p = n.data.path;
      if (p === destPath || destPath.startsWith(p + "/")) return false;
      if ((parents.current.get(p) ?? root) === destPath) return false;
      return true;
    });
  }, [root, destDirOf]);

  const moveInto = useCallback(async (dragged: TreeNode<DirEntry>[], target: TreeNode<DirEntry> | null) => {
    const destPath = destDirOf(target);
    for (const n of dragged) {
      const p = n.data.path;
      if (p === destPath || destPath.startsWith(p + "/")) continue;
      if ((parents.current.get(p) ?? root) === destPath) continue;
      try { await fs.rename(p, joinPath(destPath, n.data.name)); } catch { /* collision or in use; skip */ }
    }
    void reload();
  }, [fs, root, reload, destDirOf]);

  // ── cut / copy / paste ──
  const uniqueName = useCallback(async (destDir: string, name: string): Promise<string> => {
    const taken = new Set((await fs.list(destDir)).map((e) => e.name));
    if (!taken.has(name)) return joinPath(destDir, name);
    const [b, ext] = baseExt(name);
    let cand = `${b} copy${ext}`;
    for (let i = 2; taken.has(cand); i++) cand = `${b} copy ${i}${ext}`;
    return joinPath(destDir, cand);
  }, [fs]);

  const copyRec = useCallback(async function copyRec(entry: DirEntry, destPath: string): Promise<void> {
    if (entry.isDir) {
      await fs.createDir(destPath);
      for (const child of await fs.list(entry.path)) await copyRec(child, joinPath(destPath, child.name));
    } else {
      await fs.createFile(destPath, await fs.read(entry.path));
    }
  }, [fs]);

  const doPaste = useCallback(async (destDir: string) => {
    if (!clip || clip.paths.length === 0) return;
    for (const src of clip.paths) {
      const name = src.split("/").pop()!;
      if (destDir === src || destDir.startsWith(src + "/")) continue; // into self/descendant
      if (clip.cut) {
        if ((parents.current.get(src) ?? root) === destDir) continue; // already here
        try { await fs.rename(src, joinPath(destDir, name)); } catch { /* skip */ }
      } else {
        const entry = entries.current.get(src);
        if (entry) try { await copyRec(entry, await uniqueName(destDir, name)); } catch { /* skip */ }
      }
    }
    if (clip.cut) setClip(null); // a cut is consumed by the first paste
    void reload();
  }, [clip, fs, root, reload, copyRec, uniqueName]);

  const pasteTargetDir = useCallback((): string => {
    if (!active) return root;
    return active.isDir ? active.path : (parents.current.get(active.path) ?? root);
  }, [active, root]);

  // Import OS files dropped onto the tree: read each file's bytes (web File API — no Electron
  // path dependency, so web backends work too) and copy into destDir with a collision-safe name.
  const importFiles = useCallback(async (files: File[], destDir: string) => {
    for (const file of files) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        await fs.createFile(await uniqueName(destDir, file.name), bytes);
      } catch { /* collision / unreadable; skip */ }
    }
    void reload();
  }, [fs, uniqueName, reload]);

  // External drop: a consumer override owns it entirely; otherwise import any OS files. The
  // DataTransfer is only valid during the event, so snapshot files synchronously before awaiting.
  const handleExternalDrop = useCallback((e: ReactDragEvent, node: TreeNode<DirEntry> | null) => {
    const targetDir = destDirOf(node);
    if (onExternalDrop) { onExternalDrop(e.dataTransfer, targetDir); return; }
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    void importFiles(files, targetDir);
  }, [onExternalDrop, destDirOf, importFiles]);

  const handleClipKeys = useCallback((e: ReactKeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "x" && selected.length) { e.preventDefault(); setClip({ paths: selected.map((s) => s.path), cut: true }); }
    else if (k === "c" && selected.length) { e.preventDefault(); setClip({ paths: selected.map((s) => s.path), cut: false }); }
    else if (k === "v" && clip) { e.preventDefault(); void doPaste(pasteTargetDir()); }
  }, [selected, clip, doPaste, pasteTargetDir]);

  const startRename = useCallback((entry: DirEntry) => {
    if (entry.path === root) return;
    const dir = parents.current.get(entry.path) ?? root;
    setEditing({ kind: "rename", target: entry.path, dir, initial: entry.name });
  }, [root]);

  const startNew = useCallback((kind: "newFile" | "newFolder", dir: string) => {
    if (dir !== root) setExpanded((s) => new Set(s).add(dir)); // reveal the phantom row
    setEditing({ kind, dir });
  }, [root]);

  const commitEdit = useCallback(async (value: string) => {
    const e = editing;
    setEditing(null);
    const name = value.trim();
    if (!e || !name) return;
    try {
      if (e.kind === "rename") {
        if (name !== e.initial) await fs.rename(e.target, joinPath(e.dir, name));
      } else if (e.kind === "newFolder") {
        await fs.createDir(joinPath(e.dir, name));
      } else {
        let fname = name;
        const ext = newFile?.extension;
        if (ext && !fname.endsWith(ext)) fname += ext;
        const path = joinPath(e.dir, fname);
        await fs.createFile(path, newFile?.content ?? "");
        onOpen?.(path);
      }
    } catch { /* collision / invalid name; the watch reload reflects reality */ }
    void reload();
  }, [editing, fs, reload, newFile, onOpen]);

  const buildMenu = useCallback((entry: DirEntry): MenuItem[] => {
    const items: MenuItem[] = [];
    if (entry.isDir) {
      items.push({ id: "newFile", label: `New ${newFile?.label ?? "File"}…`, run: () => startNew("newFile", entry.path) });
      items.push({ id: "newFolder", label: "New Folder…", run: () => startNew("newFolder", entry.path) });
    }
    const extra = extraMenuItems?.(entry) ?? [];
    if (extra.length) items.push(...extra);
    if (entry.path !== root) {
      if (items.length) items.push({ separator: true });
      // If the right-clicked entry is part of a multi-selection, act on the whole set.
      const targets = selected.length > 1 && selected.some((s) => s.path === entry.path) ? selected : [entry];
      const n = targets.length;
      items.push({ id: "cut", label: n > 1 ? `Cut ${n} Items` : "Cut", run: () => setClip({ paths: targets.map((t) => t.path), cut: true }) });
      items.push({ id: "copy", label: n > 1 ? `Copy ${n} Items` : "Copy", run: () => setClip({ paths: targets.map((t) => t.path), cut: false }) });
      if (clip) items.push({ id: "paste", label: "Paste", run: () => void doPaste(entry.isDir ? entry.path : (parents.current.get(entry.path) ?? root)) });
      items.push({ separator: true });
      if (n === 1) {
        items.push({ id: "rename", label: "Rename…", run: () => startRename(entry) });
      }
      items.push({
        id: "delete",
        label: n > 1 ? `Delete ${n} Items` : "Delete",
        run: () => void removeMany(targets),
      });
      items.push({ separator: true });
      items.push({ id: "copyPath", label: "Copy Path", run: () => void clipboard.writeText(entry.path) });
      if (os) {
        // "Copy Absolute Path" only for virtual (scheme://) paths — for real-path apps it would
        // just duplicate "Copy Path". `os.realpath` resolves through the main-side adapter.
        if (entry.path.includes("://")) {
          items.push({
            id: "copyAbsPath",
            label: "Copy Absolute Path",
            run: () => void os.realpath(entry.path).then((p) => clipboard.writeText(p)),
          });
        }
        items.push({ id: "reveal", label: "Open in Files", run: () => void os.reveal(entry.path) });
      }
    }
    return items;
  }, [extraMenuItems, root, clipboard, os, removeMany, startRename, startNew, selected, newFile, clip, doPaste]);

  const openRootMenu = useCallback((e: ReactMouseEvent) => {
    const items: MenuItem[] = [
      { id: "newFile", label: `New ${newFile?.label ?? "File"}…`, run: () => startNew("newFile", root) },
      { id: "newFolder", label: "New Folder…", run: () => startNew("newFolder", root) },
    ];
    if (clip) items.push({ separator: true }, { id: "paste", label: "Paste", run: () => void doPaste(root) });
    setMenuItems(items);
    ctx.open(e);
  }, [root, ctx, newFile, startNew, clip, doPaste]);

  const editingId = editing ? (editing.kind === "rename" ? editing.target : NEW_ID) : undefined;

  return (
    <div className="h-full" onKeyDown={handleClipKeys}>
      <TreeView
        roots={displayRoots}
        ariaLabel={ariaLabel}
        expanded={expanded}
        onExpandedChange={setExpanded}
        onActivate={(node) => {
          if (!node.data.isDir) onOpen?.(node.data.path);
        }}
        className="h-full"
        editingId={editingId}
        editingInitial={editing?.kind === "rename" ? editing.initial : ""}
        onEditCommit={(v) => void commitEdit(v)}
        onEditCancel={() => setEditing(null)}
        onSelectionChange={(node) => setActive(node?.data ?? null)}
        onSelectedChange={(nodes) => setSelected(nodes.map((n) => n.data))}
        canDrop={canDrop}
        onDrop={(dragged, target) => void moveInto(dragged, target)}
        onExternalDrop={handleExternalDrop}
        onDelete={(nodes) => void removeMany(nodes.map((n) => n.data).filter((d) => d.path !== root))}
        onRename={(node) => startRename(node.data)}
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
        renderTrailing={rowActions ? (c) => rowActions(c.node.data) : undefined}
      />
      {ctx.state && <ContextMenu items={menuItems} anchor={{ x: ctx.state.x, y: ctx.state.y }} onClose={ctx.close} />}
    </div>
  );
}
