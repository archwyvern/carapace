import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ActivityBar,
  Button,
  CommandPalette,
  CommandProvider,
  EditorTabs,
  FileExplorer,
  HostProvider,
  OutputPanel,
  SpinSlider,
  SplitView,
  StatusBar,
  Workbench,
  createCommandRegistry,
  createMemoryHost,
  useCommandKeybindings,
} from "@archwyvern/carapace";
import type { MenuModel, OutputLine } from "@archwyvern/carapace";
import "./app.css";

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
  const [n, setN] = useState(42);
  const [r, setR] = useState(0.5);
  const [view, setView] = useState("files");
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
      <Workbench
        logo={<span className="px-1 font-bold text-accent">◆</span>}
        menu={MENU}
        activityBar={
          <ActivityBar
            items={[
              { id: "files", icon: <span>🗎</span>, title: "Files", active: view === "files", onClick: () => setView("files") },
              { id: "search", icon: <span>⌕</span>, title: "Search", active: view === "search", onClick: () => setView("search") },
            ]}
          />
        }
        statusBar={<StatusBar left={<span>Ready</span>} right={<span>Ctrl+P for commands</span>} />}
      >
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
              <div className="min-h-0 overflow-auto p-4">
                {activeFile ? (
                  <div className="font-mono text-sm text-fg">{activeFile}</div>
                ) : (
                  <div className="max-w-sm space-y-3">
                    <p className="text-sm text-fg">
                      Workbench + commands + SplitView + FileExplorer + EditorTabs +
                      OutputPanel. Double-click files in the tree to open tabs; try the
                      menu, Ctrl+P, Ctrl+N; drag the dividers.
                    </p>
                    <Button variant="accent" onClick={() => setPaletteOpen(true)}>
                      Open command palette
                    </Button>
                    <SpinSlider value={n} onChange={setN} integer suffix="px" />
                    <SpinSlider value={r} onChange={setR} min={0} max={1} suffix="ratio" />
                  </div>
                )}
              </div>
              <OutputPanel lines={LOG} ariaLabel="Output" />
            </SplitView>
          </div>
        </SplitView>
      </Workbench>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
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
