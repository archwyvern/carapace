import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ActivityBar,
  CommandPalette,
  CommandProvider,
  ContextMenu,
  EditorTabs,
  FileExplorer,
  HostProvider,
  OutputPanel,
  SplitView,
  StatusBar,
  ToastProvider,
  Workbench,
  createCommandRegistry,
  createMemoryHost,
  useCommandKeybindings,
  useContextMenu,
} from "@carapace/shell";
import type { MenuItem, MenuModel, OutputLine } from "@carapace/shell";
import { Gallery } from "./Gallery";
import { InspectorPage } from "./pages/InspectorPage";
import { ResourceInspectorPage } from "./pages/ResourceInspectorPage";
import { TreeViewPage } from "./pages/TreeViewPage";
import "./app.css";

type Page = "components" | "inspector" | "trees" | "resources";

const host = createMemoryHost({
  "/proj/src/main.tsx": "",
  "/proj/src/app.css": "",
  "/proj/src/components/Button.tsx": "",
  "/proj/index.html": "",
  "/proj/package.json": "",
  "/proj/README.md": "",
});

const LOG: OutputLine[] = [
  { id: 1, text: "[carapace] dev server ready", level: "info" },
  { id: 2, text: "[hmr] update applied", level: "info" },
  { id: 3, text: "warning: 'foo' is declared but never used", level: "warn" },
  { id: 4, text: "error: cannot find module './missing'", level: "error" },
];

function App() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [page, setPage] = useState<Page>("inspector");
  const [sideW, setSideW] = useState(200);
  const [consoleH, setConsoleH] = useState(120);
  const [openFiles, setOpenFiles] = useState<{ id: string; title: string }[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  const openFile = (path: string) => {
    const title = path.split("/").pop() ?? path;
    setOpenFiles((fs) => (fs.some((f) => f.id === path) ? fs : [...fs, { id: path, title }]));
    setActiveFile(path);
  };

  const registry = useMemo(
    () =>
      createCommandRegistry([
        { id: "file.new", label: "New File", category: "File", keybinding: "Ctrl+N", run: () => void host.dialog.message("New File") },
        { id: "file.open", label: "Open…", category: "File", keybinding: "Ctrl+O", run: () => {} },
        { id: "file.save", label: "Save", category: "File", keybinding: "Ctrl+S", run: () => void host.dialog.message("Saved") },
        { id: "edit.undo", label: "Undo", category: "Edit", keybinding: "Ctrl+Z", isEnabled: () => false, run: () => {} },
        { id: "view.palette", label: "Command Palette", category: "View", keybinding: "Ctrl+P", run: () => setPaletteOpen(true) },
        { id: "help.about", label: "About Carapace", category: "Help", run: () => void host.dialog.message("Carapace") },
      ]),
    [],
  );

  useCommandKeybindings(registry);

  const ctx = useContextMenu();
  const CTX_ITEMS: MenuItem[] = [
    { id: "cut", label: "Cut", shortcut: "Ctrl+X", run: () => void host.dialog.message("Cut") },
    { id: "copy", label: "Copy", shortcut: "Ctrl+C", run: () => void host.dialog.message("Copy") },
    { id: "paste", label: "Paste", shortcut: "Ctrl+V", run: () => void host.dialog.message("Paste") },
    { separator: true },
    { id: "rename", label: "Rename", run: () => void host.dialog.message("Rename") },
    { id: "del", label: "Delete", enabled: false, run: () => {} },
  ];

  const MENU: MenuModel = [
    {
      label: "&&File",
      items: [
        { command: "file.new" },
        { command: "file.open" },
        { separator: true },
        { command: "file.save" },
        { separator: true },
        { id: "exit", label: "E&&xit", run: () => host.window.close() },
      ],
    },
    { label: "&&Edit", items: [{ command: "edit.undo" }] },
    { label: "&&View", items: [{ command: "view.palette" }] },
    { label: "&&Help", items: [{ command: "help.about" }] },
  ];

  return (
    <CommandProvider registry={registry}>
      <ToastProvider>
      <Workbench
        logo={<span className="px-1 font-bold text-accent">◆</span>}
        menu={MENU}
        activityBar={
          <ActivityBar
            items={[
              { id: "components", icon: <span>🧩</span>, title: "Components", active: page === "components", onClick: () => setPage("components") },
              { id: "inspector", icon: <span>🎛</span>, title: "Inspector", active: page === "inspector", onClick: () => setPage("inspector") },
              { id: "trees", icon: <span>🌳</span>, title: "TreeView", active: page === "trees", onClick: () => setPage("trees") },
              { id: "resources", icon: <span>🗂</span>, title: "Resource Inspector", active: page === "resources", onClick: () => setPage("resources") },
            ]}
          />
        }
        statusBar={<StatusBar left={<span>Ready</span>} right={<span>Ctrl+P for commands</span>} />}
      >
        {page === "inspector" && <InspectorPage />}
        {page === "trees" && <TreeViewPage />}
        {page === "resources" && <ResourceInspectorPage />}
        {page === "components" && (
        <SplitView orientation="horizontal" primary="start" size={sideW} onResize={setSideW} min={140} max={400}>
          <div className="h-full border-r border-border bg-surface-sunken">
            <FileExplorer root="/proj" onOpen={openFile} />
          </div>
          <div className="flex h-full min-w-0 flex-col">
            <EditorTabs
              tabs={openFiles}
              activeId={activeFile}
              onSelect={setActiveFile}
              onClose={(id) => {
                setOpenFiles((fs) => fs.filter((f) => f.id !== id));
                setActiveFile((a) => (a === id ? null : a));
              }}
            />
            <SplitView orientation="vertical" primary="end" size={consoleH} onResize={setConsoleH} min={60} max={320}>
              <div className="h-full overflow-auto p-4" onContextMenu={ctx.open}>
                {activeFile ? (
                  <div className="font-mono text-sm text-fg">{activeFile}</div>
                ) : (
                  <Gallery />
                )}
              </div>
              <OutputPanel lines={LOG} ariaLabel="Output" />
            </SplitView>
          </div>
        </SplitView>
        )}
      </Workbench>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {ctx.state && (
        <ContextMenu items={CTX_ITEMS} x={ctx.state.x} y={ctx.state.y} onClose={ctx.close} />
      )}
      </ToastProvider>
    </CommandProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HostProvider host={host}>
      <App />
    </HostProvider>
  </StrictMode>,
);
