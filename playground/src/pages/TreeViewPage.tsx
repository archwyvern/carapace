import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ContextMenu, TreeView, useContextMenu } from "@carapace/shell";
import type { MenuItem, TreeNode } from "@carapace/shell";

/*
 * TreeView demos — TreeView is a GENERIC hierarchy widget, not a file explorer. These show it
 * driving real content domains:
 *   · Entity — a skyrat entity → layer → component tree, fully interactive (multiselect, drag-
 *     reorder, inline rename, delete, right-click menu, per-row visibility toggle, type icons).
 *   · Scene  — a Godot-style node tree (type icons + selection).
 *   · Lore   — a knowledge tree with child-count badges (renderTrailing).
 */

/* ------------------------------------------------------------------- icons */

function Glyph({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d={d} />
    </svg>
  );
}

const ICON = {
  entity: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
  layer: "m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5",
  sprite: "M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM21 15l-5-5L5 21",
  thruster: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z",
  light: "M15 14c.2-1 .7-1.7 1.5-2.5C17.7 10.2 18 9 18 8a6 6 0 0 0-12 0c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4",
  turret: "M22 12h-4M6 12H2M12 6V2M12 22v-4M18 12a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z",
  collider: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  folder: "M4 20h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-7l-2-3H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1Z",
  node: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  anim: "M6 4l14 8-14 8V4Z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "M9.9 9.9a3 3 0 1 0 4.2 4.2M10.7 5.1A11 11 0 0 1 12 5c6 0 10 7 10 7a13 13 0 0 1-1.7 2.7M6.6 6.6A13 13 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.4-1.4M2 2l20 20",
  trash: "M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6",
  rename: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z",
  add: "M12 5v14M5 12h14",
};

/* ------------------------------------------------------------ tree helpers */

let uid = 100;
const nextId = () => `n${++uid}`;

function updateNode<T>(nodes: TreeNode<T>[], id: string, patch: Partial<T>): TreeNode<T>[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, data: { ...n.data, ...patch } }
      : n.children
        ? { ...n, children: updateNode(n.children, id, patch) }
        : n,
  );
}

function findData<T>(nodes: TreeNode<T>[], id: string): T | undefined {
  for (const n of nodes) {
    if (n.id === id) return n.data;
    if (n.children) {
      const r = findData(n.children, id);
      if (r !== undefined) return r;
    }
  }
  return undefined;
}

function removeIds<T>(nodes: TreeNode<T>[], ids: Set<string>): TreeNode<T>[] {
  return nodes
    .filter((n) => !ids.has(n.id))
    .map((n) => (n.children ? { ...n, children: removeIds(n.children, ids) } : n));
}

function addChild<T>(nodes: TreeNode<T>[], parentId: string, child: TreeNode<T>): TreeNode<T>[] {
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: [...(n.children ?? []), child] }
      : n.children
        ? { ...n, children: addChild(n.children, parentId, child) }
        : n,
  );
}

function containsId<T>(node: TreeNode<T>, id: string): boolean {
  return node.id === id || (node.children?.some((c) => containsId(c, id)) ?? false);
}

/** Move dragged ids relative to a target (reorder DnD). */
function moveNodes<T>(nodes: TreeNode<T>[], draggedIds: string[], targetId: string | null, position: "before" | "into" | "after"): TreeNode<T>[] {
  const idSet = new Set(draggedIds);
  const removed: TreeNode<T>[] = [];
  const strip = (list: TreeNode<T>[]): TreeNode<T>[] => {
    const out: TreeNode<T>[] = [];
    for (const n of list) {
      if (idSet.has(n.id)) { removed.push(n); continue; }
      out.push(n.children ? { ...n, children: strip(n.children) } : n);
    }
    return out;
  };
  const remaining = strip(nodes);
  if (targetId == null) return [...remaining, ...removed];
  const insert = (list: TreeNode<T>[]): TreeNode<T>[] => {
    const out: TreeNode<T>[] = [];
    for (const n of list) {
      if (n.id === targetId) {
        if (position === "before") { out.push(...removed, n); }
        else if (position === "after") { out.push(n, ...removed); }
        else { out.push({ ...n, children: [...(n.children ?? []), ...removed] }); }
      } else {
        out.push(n.children ? { ...n, children: insert(n.children) } : n);
      }
    }
    return out;
  };
  return insert(remaining);
}

/* --------------------------------------------------------------- chrome */

function Dock({ title, subtitle, footer, children }: { title: string; subtitle: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex w-72 shrink-0 flex-col border border-border bg-surface">
      <div className="border-b border-border bg-surface-raised px-2.5 py-1.5">
        <div className="text-xs font-bold text-fg">{title}</div>
        <div className="text-xs text-fg-mid">{subtitle}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-1">{children}</div>
      {footer && <div className="border-t border-border px-2.5 py-1.5 text-2xs text-fg-mid">{footer}</div>}
    </div>
  );
}

/* ------------------------------------------------- 1. Entity hierarchy (skyrat) */

type Ent = { name: string; kind: keyof typeof ICON; sub?: string; visible: boolean };
const ent = (name: string, kind: Ent["kind"], sub: string | undefined, children?: TreeNode<Ent>[]): TreeNode<Ent> => ({
  id: nextId(),
  data: { name, kind, sub, visible: true },
  children,
});

const ENTITY_TREE: TreeNode<Ent>[] = [
  ent("Demo Skyla", "entity", "DLEntityHullShip", [
    ent("Hull", "layer", undefined, [
      ent("Structure", "sprite", "hull_main", []),
      ent("Engine", "layer", undefined, [
        ent("Thruster", "thruster", "Ion Drive", []),
        ent("PoweredLight", "light", "Engine Glow", []),
      ]),
      ent("Cockpit", "layer", undefined, [
        ent("Structure", "sprite", "cockpit", []),
        ent("PoweredLight", "light", "Nav Light", []),
      ]),
    ]),
    ent("Turrets", "folder", undefined, [
      ent("Main Gun", "turret", "Large · Group0", []),
      ent("Point Defense", "turret", "Small · Group1", []),
    ]),
    ent("Colliders", "folder", undefined, [ent("Hull Outline", "collider", "polygon · 6 pts", [])]),
  ]),
];

const TINT: Partial<Record<Ent["kind"], string>> = {
  entity: "text-accent",
  layer: "text-info",
  sprite: "text-fg-mid",
  thruster: "text-warning",
  light: "text-warning",
  turret: "text-error",
  collider: "text-success",
  folder: "text-fg-mid",
};

function EntityTreeDemo() {
  const [tree, setTree] = useState(ENTITY_TREE);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [selCount, setSelCount] = useState(1);
  const [menuNode, setMenuNode] = useState<TreeNode<Ent> | null>(null);
  const ctx = useContextMenu();

  const expanded = useMemo(() => new Set(tree.flatMap((n) => [n.id, ...(n.children ?? []).map((c) => c.id)])), [tree]);

  const startRename = (n: TreeNode<Ent>) => setEditingId(n.id);
  const del = (nodes: TreeNode<Ent>[]) => setTree((t) => removeIds(t, new Set(nodes.map((n) => n.id))));
  const isContainer = (k: Ent["kind"]) => k === "entity" || k === "layer" || k === "folder";

  const menuItems = (n: TreeNode<Ent>): MenuItem[] => {
    const items: MenuItem[] = [];
    if (isContainer(n.data.kind)) {
      items.push({ id: "add-layer", label: "Add Layer", run: () => setTree((t) => addChild(t, n.id, ent("New Layer", "layer", undefined, []))) });
      items.push({ id: "add-comp", label: "Add Component", run: () => setTree((t) => addChild(t, n.id, ent("Sprite", "sprite", "untitled", []))) });
      items.push({ separator: true });
    }
    items.push({ id: "vis", label: n.data.visible ? "Hide" : "Show", run: () => setTree((t) => updateNode(t, n.id, { visible: !n.data.visible })) });
    items.push({ id: "rename", label: "Rename", shortcut: "F2", run: () => startRename(n) });
    items.push({ id: "del", label: "Delete", shortcut: "Del", run: () => del([n]) });
    return items;
  };

  return (
    <Dock title="Entity" subtitle="skyrat · layers + components" footer={`${selCount} selected · drag to reorder · F2 rename · Del · right-click`}>
      <TreeView<Ent>
        roots={tree}
        ariaLabel="Entity hierarchy"
        defaultExpanded={expanded}
        reorder
        canDrop={(dragged, target) => !target || (!dragged.some((d) => d.id === target.id) && !dragged.some((d) => containsId(d, target.id)))}
        onDrop={(dragged, target, position) => setTree((t) => moveNodes(t, dragged.map((d) => d.id), target?.id ?? null, position ?? "into"))}
        onSelectedChange={(nodes) => setSelCount(Math.max(1, nodes.length))}
        onDelete={del}
        onRename={startRename}
        editingId={editingId}
        editingInitial={editingId ? findData(tree, editingId)?.name : undefined}
        onEditCommit={(value) => {
          if (editingId && value.trim()) setTree((t) => updateNode(t, editingId, { name: value.trim() }));
          setEditingId(undefined);
        }}
        onEditCancel={() => setEditingId(undefined)}
        onContextMenu={(node, e) => { setMenuNode(node); ctx.open(e); }}
        renderItem={({ node }) => (
          <span className={`flex min-w-0 items-center gap-1.5 ${node.data.visible ? "" : "opacity-45"}`}>
            <Glyph d={ICON[node.data.kind]} className={TINT[node.data.kind] ?? "text-fg-mid"} />
            <span className="truncate text-fg">{node.data.name}</span>
            {node.data.sub && <span className="truncate text-2xs text-fg-mid">{node.data.sub}</span>}
          </span>
        )}
        renderTrailing={({ node }) => (
          <button
            type="button"
            aria-label={node.data.visible ? "Hide" : "Show"}
            onClick={(e) => { e.stopPropagation(); setTree((t) => updateNode(t, node.id, { visible: !node.data.visible })); }}
            className={`mr-1 flex items-center text-fg-mid hover:text-fg ${node.data.visible ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
          >
            <Glyph d={node.data.visible ? ICON.eye : ICON.eyeOff} className="h-3.5 w-3.5" />
          </button>
        )}
      />
      {ctx.state && menuNode && <ContextMenu items={menuItems(menuNode)} x={ctx.state.x} y={ctx.state.y} onClose={ctx.close} />}
    </Dock>
  );
}

/* ------------------------------------------------------- 2. Scene tree (Godot) */

type Scene = { name: string; kind: keyof typeof ICON };
const sc = (name: string, kind: Scene["kind"], children?: TreeNode<Scene>[]): TreeNode<Scene> => ({ id: nextId(), data: { name, kind }, children });

const SCENE_TREE: TreeNode<Scene>[] = [
  sc("Main", "node", [
    sc("Player", "node", [
      sc("Sprite2D", "sprite"),
      sc("Camera2D", "camera"),
      sc("CollisionShape2D", "collider"),
      sc("AnimationPlayer", "anim"),
    ]),
    sc("Enemies", "folder", [sc("Raider", "node"), sc("Turret", "turret")]),
    sc("Background", "sprite"),
  ]),
];

function SceneTreeDemo() {
  const [sel, setSel] = useState("");
  return (
    <Dock title="Scene" subtitle="godot node tree · selection">
      <TreeView<Scene>
        roots={SCENE_TREE}
        ariaLabel="Scene tree"
        defaultExpanded={new Set(SCENE_TREE.flatMap((n) => [n.id, ...(n.children ?? []).map((c) => c.id)]))}
        onSelectionChange={(n) => setSel(n?.data.name ?? "")}
        renderItem={({ node }) => (
          <span className="flex min-w-0 items-center gap-1.5">
            <Glyph d={ICON[node.data.kind]} className={node.data.name === sel ? "text-accent" : "text-info"} />
            <span className="truncate text-fg">{node.data.name}</span>
          </span>
        )}
      />
    </Dock>
  );
}

/* ------------------------------------------------------------- 3. Lore tree */

type Lore = { name: string };
const lo = (name: string, children?: TreeNode<Lore>[]): TreeNode<Lore> => ({ id: nextId(), data: { name }, children });

const LORE_TREE: TreeNode<Lore>[] = [
  lo("Factions", [
    lo("Corporations", [lo("Vasca Industries"), lo("Orolyn Combine"), lo("Midian Yards")]),
    lo("Governments", [lo("Coreward Pact"), lo("Free Rim")]),
  ]),
  lo("Technology", [lo("Propulsion", [lo("Ion Drives"), lo("Fusion Torch")]), lo("Weapons")]),
];

function countDescendants(n: TreeNode<Lore>): number {
  return (n.children ?? []).reduce((acc, c) => acc + 1 + countDescendants(c), 0);
}

function LoreTreeDemo() {
  return (
    <Dock title="Lore" subtitle="knowledge tree · count badges">
      <TreeView<Lore>
        roots={LORE_TREE}
        ariaLabel="Lore tree"
        defaultExpanded={new Set(LORE_TREE.map((n) => n.id))}
        renderItem={({ node }) => (
          <span className="flex min-w-0 items-center gap-1.5">
            <Glyph d={node.children?.length ? ICON.folder : ICON.node} className="text-fg-mid" />
            <span className="truncate text-fg">{node.data.name}</span>
          </span>
        )}
        renderTrailing={({ node, collapsible }) =>
          collapsible ? (
            <span className="mr-1.5 rounded border border-border bg-surface-sunken px-1 text-2xs text-fg-mid">{countDescendants(node)}</span>
          ) : null
        }
      />
    </Dock>
  );
}

/* ------------------------------------------------------------------- page */

export function TreeViewPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-widest text-accent">Carapace · TreeView</div>
        <h1 className="text-base font-bold text-fg">TreeView showcase</h1>
        <p className="mt-0.5 text-xs text-fg-mid">
          TreeView is a generic hierarchy widget — not everything is a file explorer. An interactive
          skyrat entity/layer/component tree (multiselect, drag-reorder, inline rename, delete,
          right-click menu, per-row visibility), a Godot scene tree, and a lore tree with count badges.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-auto p-4">
        <EntityTreeDemo />
        <SceneTreeDemo />
        <LoreTreeDemo />
      </div>
    </div>
  );
}
