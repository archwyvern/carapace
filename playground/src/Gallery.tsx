import { useState } from "react";
import type { ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  ColorPicker,
  ColorPickerButton,
  ConfirmDialog,
  DirectionPicker,
  FormColor,
  FormEnum,
  FormSlider,
  FormToggle,
  FormVec,
  Modal,
  PageHeader,
  PositionPicker,
  PromptDialog,
  SectionHeader,
  ShortcutOverlay,
  SpinSlider,
  Toolbar,
  TreeFind,
  TreeView,
  TypedConfirmDialog,
  treeFilter,
  useToast,
} from "@carapace/shell";
import type { BadgeTone, TreeNode } from "@carapace/shell";

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
      <ShortcutOverlay open={shortcuts} onClose={() => setShortcuts(false)} />
    </div>
  );
}
