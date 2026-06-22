import { useState } from "react";
import type { ReactNode } from "react";
import {
  Badge,
  Button,
  CheckIcon,
  ContextMenuTrigger,
  Menu,
  SearchIcon,
  SectionHeader,
  useContextMenu,
} from "@carapace/shell";
import type { MenuItem } from "@carapace/shell";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <SectionHeader>{title}</SectionHeader>
      <div className="space-y-3 px-2 pt-1">{children}</div>
    </section>
  );
}

const dropZone =
  "flex items-center justify-center border border-dashed border-border bg-surface-sunken text-fg-mid";

/** A live showcase of every context-menu feature. */
export function ContextMenuPage() {
  const [wrap, setWrap] = useState(true);
  const [align, setAlign] = useState("left");
  const [size, setSize] = useState<"sm" | "md">("sm");
  const point = useContextMenu();
  const [log, setLog] = useState("");

  const richItems: MenuItem[] = [
    { header: "Edit" },
    { label: "Cut", shortcut: "Ctrl+X", run: () => setLog("cut") },
    { label: "Copy", shortcut: "Ctrl+C", icon: <CheckIcon className="h-3.5 w-3.5" />, run: () => setLog("copy") },
    { label: "Paste", shortcut: "Ctrl+V", description: "from clipboard", run: () => setLog("paste") },
    { separator: true },
    { label: "Word Wrap", role: "checkbox", checked: wrap, keepOpen: true, run: () => setWrap((w) => !w) },
    {
      radio: true,
      name: "Align",
      value: align,
      onChange: setAlign,
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
    },
    { separator: true },
    {
      label: "Open Recent",
      items: [
        { label: "main.tsx", run: () => setLog("main") },
        { label: "app.css", run: () => setLog("css") },
        {
          label: "More…",
          items: () =>
            new Promise<MenuItem[]>((r) =>
              setTimeout(
                () =>
                  r([
                    { label: "deep-1.ts", run: () => setLog("d1") },
                    { label: "deep-2.ts", run: () => setLog("d2") },
                  ]),
                400,
              ),
            ),
        },
      ],
    },
    { label: "Empty Submenu", items: [] },
    { separator: true },
    { label: "Custom row", render: () => <span className="text-accent">★ custom node</span> },
    { label: "Disabled", enabled: false, disabledReason: "Nothing selected", run: () => {} },
    { label: "Delete", danger: true, shortcut: "Del", run: () => setLog("delete") },
  ];

  const tall: MenuItem[] = Array.from({ length: 60 }, (_, i) => ({
    label: `Item ${i + 1}`,
    run: () => setLog(`item ${i + 1}`),
  }));

  return (
    <div className="max-w-2xl space-y-6 p-4 pb-16">
      <SectionHeader>Context Menu — every feature</SectionHeader>
      <div className="text-2xs text-fg-mid">last action: {log || "—"}</div>

      <Group title="Right-click surface (all item kinds)">
        <ContextMenuTrigger items={richItems} size={size}>
          <div className={`${dropZone} h-40`}>right-click anywhere here</div>
        </ContextMenuTrigger>
      </Group>

      <Group title="Programmatic open + dynamic point">
        <Button onClick={(e) => point.open({ x: e.clientX, y: e.clientY })}>Open at click</Button>
        {point.state && (
          <Menu
            items={richItems}
            open
            onOpenChange={(o) => {
              if (!o) point.close();
            }}
            anchor={point.state}
            size={size}
          />
        )}
      </Group>

      <Group title="Tall menu — scroll + typeahead">
        <ContextMenuTrigger items={tall} size={size}>
          <div className={`${dropZone} h-16`}>right-click for 60 items</div>
        </ContextMenuTrigger>
      </Group>

      <Group title="Filterable">
        <ContextMenuTrigger items={tall} size={size} filterable>
          <div className={`${dropZone} h-16`}>
            <SearchIcon className="mr-2 h-4 w-4" /> right-click for a filterable menu
          </div>
        </ContextMenuTrigger>
      </Group>

      <Group title="RTL">
        <div dir="rtl">
          <ContextMenuTrigger items={richItems} size={size}>
            <div className={`${dropZone} h-24`}>قائمة السياق (right-click)</div>
          </ContextMenuTrigger>
        </div>
      </Group>

      <Group title="Density">
        <div className="flex items-center gap-2">
          <Button variant={size === "sm" ? "accent" : undefined} onClick={() => setSize("sm")}>
            Small
          </Button>
          <Button variant={size === "md" ? "accent" : undefined} onClick={() => setSize("md")}>
            Medium
          </Button>
          <Badge tone="neutral">{size}</Badge>
        </div>
      </Group>
    </div>
  );
}
