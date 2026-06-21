import { useState } from "react";
import type { ReactNode } from "react";
import {
  AddIcon,
  Badge,
  Button,
  Card,
  CheckIcon,
  CloseIcon,
  Collapsible,
  ColorPicker,
  ColorPickerButton,
  ConfirmDialog,
  DirectionPicker,
  EmptyState,
  FormColor,
  FormEnum,
  FormSlider,
  FormToggle,
  FormVec,
  GradientBar,
  Grid,
  IconButton,
  ImageLightbox,
  Modal,
  PageHeader,
  Panel,
  PositionPicker,
  PromptDialog,
  ResetIcon,
  Rulers,
  SearchIcon,
  SectionHeader,
  Select,
  ShortcutGuide,
  ShortcutOverlay,
  Spinner,
  SpinSlider,
  StatusDot,
  Tabs,
  TagInput,
  TextInput,
  Thumbnail,
  Toolbar,
  Tooltip,
  TreeFind,
  TreeView,
  TypedConfirmDialog,
  treeFilter,
  useGridSelection,
  useToast,
} from "@carapace/shell";
import type { BadgeTone, GradientStop, TabItem, TreeNode } from "@carapace/shell";

const swatch = (hex: string, label: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%' height='100%' fill='${hex}'/><text x='50%' y='53%' font-family='sans-serif' font-size='30' fill='white' text-anchor='middle'>${label}</text></svg>`,
  )}`;

const TILES: { id: string; label: string; hex: string; status: BadgeTone }[] = [
  { id: "t1", label: "Nebula", hex: "#3b5bdb", status: "success" },
  { id: "t2", label: "Hull", hex: "#d6a35a", status: "info" },
  { id: "t3", label: "Engine", hex: "#c0392b", status: "warning" },
  { id: "t4", label: "Cockpit", hex: "#16a085", status: "neutral" },
  { id: "t5", label: "Turret", hex: "#8e44ad", status: "error" },
];
const LIGHTBOX = TILES.map((t) => ({ src: swatch(t.hex, t.label), caption: t.label }));

const TONES: BadgeTone[] = ["accent", "info", "success", "warning", "error", "neutral"];

const SAMPLE_TREE: TreeNode<string>[] = [
  {
    id: "src",
    data: "src",
    children: [
      { id: "index.ts", data: "index.ts" },
      { id: "app.tsx", data: "app.tsx" },
    ],
  },
  { id: "readme", data: "README.md" },
  { id: "pkg", data: "package.json" },
];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <SectionHeader>{title}</SectionHeader>
      <div className="space-y-3 px-2 pt-1">{children}</div>
    </section>
  );
}

type DialogKind = "modal" | "confirm" | "prompt" | "typed";

/** A live showcase of every Carapace component. */
export function Gallery() {
  const toast = useToast();
  const [enumV, setEnumV] = useState(0);
  const [toggleV, setToggleV] = useState(true);
  const [vec, setVec] = useState([1, 2, 3]);
  const [slider, setSlider] = useState(0.5);
  const [tint, setTint] = useState([0.3, 0.6, 0.9, 1]);
  const [pick, setPick] = useState([1, 0.5, 0]);
  const [px, setPx] = useState(42);
  const [dir, setDir] = useState({ x: 0.4, y: -0.3 });
  const [pos, setPos] = useState({ x: 0.2, y: 0.5 });
  const [find, setFind] = useState("");
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [shortcuts, setShortcuts] = useState(false);
  const [tab, setTab] = useState("design");
  const [search, setSearch] = useState("");
  const [selectV, setSelectV] = useState("md");
  const [tags, setTags] = useState<string[]>(["engine", "ion"]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const tileSel = useGridSelection(TILES.map((t) => t.id));
  const [gradient, setGradient] = useState<GradientStop[]>([
    { offset: 0, color: "#0d121f" },
    { offset: 0.5, color: "#d66b33" },
    { offset: 1, color: "#ffe6a6" },
  ]);

  const TABS: TabItem[] = [
    { id: "design", label: "Design" },
    { id: "code", label: "Code" },
    { id: "preview", label: "Preview" },
    { id: "export", label: "Export", disabled: true },
  ];

  const filtered = treeFilter(SAMPLE_TREE, find, (node) => node.data);

  return (
    <div className="max-w-2xl space-y-6 pb-16">
      <PageHeader eyebrow="Carapace" title="Component Gallery" actions={<Badge tone="success">live</Badge>} />

      <Group title="Buttons, Badges, Card">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Default</Button>
          <Button variant="accent">Accent</Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((t) => (
            <Badge key={t} tone={t}>
              {t}
            </Badge>
          ))}
        </div>
        <Card
          interactive
          className="max-w-xs p-3"
          onClick={() => toast.notify("Card clicked", { tone: "info" })}
        >
          <span className="text-sm text-fg">Interactive card — click or press Enter</span>
        </Card>
      </Group>

      <Group title="Toolbar">
        <Toolbar>
          <span className="text-sm text-fg-mid">Toolbar</span>
          <div className="flex gap-2">
            <Button>Action</Button>
            <Button variant="accent">Primary</Button>
          </div>
        </Toolbar>
      </Group>

      <Group title="Icon buttons, inputs, spinner, tooltip">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton label="Add" icon={<AddIcon />} />
          <IconButton label="Confirm" variant="accent" icon={<CheckIcon />} />
          <IconButton label="Reset" icon={<ResetIcon />} />
          <IconButton label="Delete" variant="danger" icon={<CloseIcon />} />
          <IconButton label="Search" active icon={<SearchIcon />} />
          <IconButton label="Add (md)" size="md" icon={<AddIcon />} />
          <Tooltip content="Hover tooltip — portaled, pointer-transparent">
            <IconButton label="Help" icon={<SearchIcon />} />
          </Tooltip>
          <Spinner size="sm" />
          <Spinner />
        </div>
        <div className="flex max-w-sm items-center gap-2">
          <SearchIcon className="h-4 w-4 shrink-0 text-fg-mid" />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter…" />
          <TextInput value="invalid" onChange={() => {}} invalid readOnly className="max-w-[120px]" />
        </div>
      </Group>

      <Group title="Tabs">
        <Tabs items={TABS} value={tab} onChange={setTab} />
        <Tabs items={TABS} value={tab} onChange={setTab} variant="underline" />
        <div className="text-xs text-fg-mid">active: {tab}</div>
      </Group>

      <Group title="Collapsible">
        <div className="max-w-sm space-y-2 border border-border bg-surface">
          <Collapsible title="Transform" trailing={<Badge tone="neutral">3</Badge>}>
            <div className="space-y-2 p-2">
              <FormVec label="Position" value={vec} size={3} onChange={setVec} />
              <FormSlider label="Opacity" value={slider} min={0} max={1} step={0.01} onChange={setSlider} />
            </div>
          </Collapsible>
          <Collapsible title="Advanced" defaultOpen={false} variant="plain">
            <div className="p-2 text-xs text-fg-mid">Hidden until expanded.</div>
          </Collapsible>
        </div>
      </Group>

      <Group title="Panel + Grid">
        <Panel
          title="Assets"
          subtitle="12 items"
          actions={<IconButton label="Add asset" icon={<AddIcon />} />}
          footer="drag to reorder"
          className="h-64 max-w-xl"
        >
          <Grid minColWidth={120} gap={8} className="p-2">
            {Array.from({ length: 9 }, (_, i) => (
              <Card key={i} interactive className="flex aspect-square items-center justify-center text-xs text-fg-mid">
                tile {i + 1}
              </Card>
            ))}
          </Grid>
        </Panel>
      </Group>

      <Group title="Empty / loading / error states">
        <div className="grid grid-cols-2 gap-3">
          <Panel className="h-40">
            <EmptyState status="empty" title="No assets yet" message="Import or create one to get started." action={<Button variant="accent">New asset</Button>} />
          </Panel>
          <Panel className="h-40">
            <EmptyState status="loading" message="Loading assets…" />
          </Panel>
          <Panel className="h-40">
            <EmptyState status="error" title="Failed to load" message="The asset service is unreachable." action={<Button>Retry</Button>} />
          </Panel>
          <Panel className="h-40">
            <EmptyState status="info" title="Read-only" message="This project is shared with you." />
          </Panel>
        </div>
      </Group>

      <Group title="Select, tags, status dots">
        <div className="max-w-sm space-y-3">
          <Select
            ariaLabel="Size"
            value={selectV}
            onChange={setSelectV}
            options={[
              { value: "xs", label: "Extra small" },
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "Extra large (disabled)", disabled: true },
            ]}
          />
          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={["engine", "ion", "plasma", "fusion", "thruster", "nav", "shield", "hull"]}
            placeholder="Add tag…"
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-fg-mid">
            <span className="flex items-center gap-1.5"><StatusDot tone="success" /> online</span>
            <span className="flex items-center gap-1.5"><StatusDot tone="warning" pulse /> building</span>
            <span className="flex items-center gap-1.5"><StatusDot tone="error" /> failed</span>
            <span className="flex items-center gap-1.5"><StatusDot tone="neutral" /> idle</span>
          </div>
        </div>
      </Group>

      <Group title="Thumbnails · grid-selection · lightbox">
        <div className="text-2xs text-fg-mid">click · Ctrl/Shift-click to multi-select · double-click to open</div>
        <Grid minColWidth={120} gap={10} className="max-w-xl">
          {TILES.map((t, i) => (
            <Thumbnail
              key={t.id}
              src={swatch(t.hex, t.label)}
              label={t.label}
              status={t.status}
              statusPulse={t.status === "warning"}
              badge={<Badge tone="neutral">png</Badge>}
              selected={tileSel.isSelected(t.id)}
              onClick={(e) => tileSel.onItemClick(t.id, e)}
              onDoubleClick={() => setLightbox(i)}
            />
          ))}
        </Grid>
      </Group>

      <Group title="Gradient editor & rulers (canvas chrome)">
        <div className="max-w-md space-y-4">
          <GradientBar stops={gradient} onChange={setGradient} />
          <div className="h-56 overflow-hidden rounded-control border border-border">
            <Rulers scale={2} origin={{ x: 24, y: 24 }}>
              <div className="flex h-full w-full items-center justify-center bg-surface-sunken text-2xs text-fg-mid">
                viewport content
              </div>
            </Rulers>
          </div>
          <div className="text-2xs text-fg-mid">shortcut guide is pinned bottom-left ↙</div>
        </div>
      </Group>

      <Group title="Form controls">
        <div className="max-w-sm space-y-3">
          <FormEnum label="Mode" value={enumV} options={["Linear", "Smooth", "Step"]} onChange={setEnumV} />
          <FormToggle label="Snap to grid" value={toggleV} onChange={setToggleV} />
          <FormVec label="Position" value={vec} size={3} onChange={setVec} />
          <FormSlider label="Opacity" value={slider} min={0} max={1} step={0.01} onChange={setSlider} />
          <FormColor label="Tint" value={tint} hasAlpha onChange={setTint} />
        </div>
      </Group>

      <Group title="SpinSlider">
        <div className="flex max-w-sm gap-3">
          <div className="flex-1">
            <SpinSlider value={px} onChange={setPx} integer suffix="px" />
          </div>
          <div className="flex-1">
            <SpinSlider value={slider} onChange={setSlider} min={0} max={1} suffix="ratio" />
          </div>
        </div>
      </Group>

      <Group title="Colour">
        <div className="flex flex-wrap items-start gap-4">
          <ColorPicker value={pick} onChange={setPick} />
          <div className="space-y-1">
            <div className="h-6 w-40">
              <ColorPickerButton value={pick} onChange={setPick} />
            </div>
            <span className="text-xs text-fg-mid">ColorPickerButton (click)</span>
          </div>
        </div>
      </Group>

      <Group title="Pickers">
        <div className="flex flex-wrap gap-8">
          <DirectionPicker label="Direction" value={dir} onChange={setDir} />
          <PositionPicker label="Position" value={pos} onChange={setPos} />
        </div>
      </Group>

      <Group title="Tree + find">
        <div className="max-w-xs border border-border">
          <TreeFind onPatternChange={setFind} onClose={() => setFind("")} />
          <TreeView
            roots={filtered}
            defaultExpanded={new Set(["src"])}
            ariaLabel="Sample tree"
            renderItem={(c) => <span>{c.node.data}</span>}
          />
        </div>
      </Group>

      <Group title="Overlays & toasts">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog("modal")}>Modal</Button>
          <Button onClick={() => setDialog("confirm")}>Confirm</Button>
          <Button onClick={() => setDialog("prompt")}>Prompt</Button>
          <Button onClick={() => setDialog("typed")}>Typed confirm</Button>
          <Button onClick={() => setShortcuts(true)}>Shortcuts</Button>
          <Button variant="accent" onClick={() => toast.notify("Saved!", { tone: "success" })}>
            Toast: success
          </Button>
          <Button onClick={() => toast.notify("Something failed", { tone: "error" })}>Toast: error</Button>
        </div>
      </Group>

      {dialog === "modal" && (
        <Modal title="A Modal" onClose={() => setDialog(null)}>
          <p className="mb-3 text-sm text-fg-mid">Focus-trapped; Escape or click outside to dismiss.</p>
          <div className="flex justify-end">
            <Button variant="accent" onClick={() => setDialog(null)}>
              OK
            </Button>
          </div>
        </Modal>
      )}
      {dialog === "confirm" && (
        <ConfirmDialog
          title="Delete file?"
          message="This cannot be undone."
          danger
          confirmLabel="Delete"
          onConfirm={() => {
            setDialog(null);
            toast.notify("Deleted", { tone: "error" });
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "prompt" && (
        <PromptDialog
          title="Rename"
          message="New name:"
          initialValue="file.ts"
          validate={(v) => (v.length < 1 ? "Required" : null)}
          onConfirm={(v) => {
            setDialog(null);
            toast.notify(`Renamed to ${v}`);
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "typed" && (
        <TypedConfirmDialog
          title="Delete project"
          message="This permanently deletes everything."
          expectedText="my-project"
          expectedLabel="project name"
          onConfirm={() => {
            setDialog(null);
            toast.notify("Project deleted", { tone: "error" });
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {lightbox !== null && (
        <ImageLightbox
          images={LIGHTBOX}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
      <ShortcutGuide
        corner="bottom-left"
        storageKey="carapace-playground-shortcuts"
        items={[
          { keys: "Ctrl+P", label: "Command palette" },
          { keys: "Ctrl+S", label: "Save" },
          { keys: "F2", label: "Rename" },
          { keys: "Del", label: "Delete" },
          { keys: "Space", label: "Pan canvas" },
        ]}
      />
      <ShortcutOverlay open={shortcuts} onClose={() => setShortcuts(false)} />
    </div>
  );
}
