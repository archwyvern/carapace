import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HostProvider } from "../host/context";
import { createMemoryHost } from "../host/memoryHost";
import { FileExplorer } from "./FileExplorer";

// jsdom doesn't implement File.arrayBuffer(); the import path only needs name + arrayBuffer,
// so stand in a faithful stub (real Chromium/Electron supplies a full File).
function fakeFile(name: string, bytes: number[]): File {
  return { name, arrayBuffer: async () => new Uint8Array(bytes).buffer } as unknown as File;
}

function setup(onOpen: (p: string) => void = () => {}) {
  const host = createMemoryHost({
    "/proj/src/main.tsx": "x",
    "/proj/src/app.css": "y",
    "/proj/README.md": "z",
  });
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" onOpen={onOpen} />
    </HostProvider>,
  );
}

test("renders the file tree from the host fs", async () => {
  setup();
  expect(await screen.findByText("src")).toBeInTheDocument();
  expect(screen.getByText("README.md")).toBeInTheDocument();
});

test("expanding a directory shows its files", async () => {
  setup();
  await screen.findByText("src");
  await userEvent.click(screen.getByRole("button", { name: "Expand" }));
  expect(screen.getByText("main.tsx")).toBeInTheDocument();
  expect(screen.getByText("app.css")).toBeInTheDocument();
});

test("activating a file calls onOpen with its path", async () => {
  const onOpen = vi.fn();
  setup(onOpen);
  await screen.findByText("src");
  await userEvent.click(screen.getByRole("button", { name: "Expand" }));
  await userEvent.dblClick(screen.getByText("main.tsx"));
  expect(onOpen).toHaveBeenCalledWith("/proj/src/main.tsx");
});

test("exclude omits matching entries (and never walks into them)", async () => {
  const host = createMemoryHost({
    "/proj/src/main.tsx": "x",
    "/proj/node_modules/dep/index.js": "y",
    "/proj/README.md": "z",
  });
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" exclude={(e) => e.isDir && e.name === "node_modules"} />
    </HostProvider>,
  );
  expect(await screen.findByText("src")).toBeInTheDocument();
  expect(screen.getByText("README.md")).toBeInTheDocument();
  expect(screen.queryByText("node_modules")).not.toBeInTheDocument();
});

test("rename via context menu renames the file + fires onDidRename", async () => {
  const host = createMemoryHost({ "/proj/README.md": "z" });
  const renameSpy = vi.spyOn(host.fs, "rename");
  const onDidRename = vi.fn();
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" onDidRename={onDidRename} />
    </HostProvider>,
  );
  const row = await screen.findByText("README.md");
  fireEvent.contextMenu(row);
  await userEvent.click(await screen.findByText("Rename…"));
  const input = await screen.findByDisplayValue("README.md");
  await userEvent.clear(input);
  await userEvent.type(input, "DOCS.md{Enter}");
  expect(renameSpy).toHaveBeenCalledWith("/proj/README.md", "/proj/DOCS.md");
  expect(onDidRename).toHaveBeenCalledWith("/proj/README.md", "/proj/DOCS.md");
  expect(await screen.findByText("DOCS.md")).toBeInTheDocument();
});

test("inline rename ignores the involuntary blur on open (closing-menu focus return)", async () => {
  // Repro of the real-DOM bug: opening rename from the context menu closes the menu, whose focus
  // manager returns focus to the trigger and blurs the just-mounted editor. The editor must NOT
  // commit on that steal (which would no-op + vanish); it stays open and editable.
  const host = createMemoryHost({ "/proj/testship.lmb": "{}" });
  const renameSpy = vi.spyOn(host.fs, "rename");
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" />
    </HostProvider>,
  );
  const row = await screen.findByText("testship.lmb");
  fireEvent.contextMenu(row);
  await userEvent.click(await screen.findByText("Rename…"));
  const input = await screen.findByDisplayValue("testship.lmb");
  fireEvent.blur(input); // the focus-return steal, before the user has typed
  expect(renameSpy).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue("testship.lmb")).toBeInTheDocument(); // editor survived
  // and the user can now actually rename
  await userEvent.clear(input);
  await userEvent.type(input, "newship.lmb{Enter}");
  expect(renameSpy).toHaveBeenCalledWith("/proj/testship.lmb", "/proj/newship.lmb");
});

test("dropping OS files imports them into the target folder", async () => {
  const host = createMemoryHost({ "/proj/README.md": "z" });
  const createSpy = vi.spyOn(host.fs, "createFile");
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" />
    </HostProvider>,
  );
  await screen.findByText("README.md");
  const file = fakeFile("drop.png", [1, 2, 3]);
  fireEvent.drop(screen.getByRole("tree"), { dataTransfer: { files: [file], items: [], types: ["Files"] } });
  expect(await screen.findByText("drop.png")).toBeInTheDocument();
  expect(createSpy).toHaveBeenCalledWith("/proj/drop.png", expect.any(Uint8Array));
});

test("a consumer onExternalDrop overrides the built-in import", async () => {
  const host = createMemoryHost({ "/proj/README.md": "z" });
  const createSpy = vi.spyOn(host.fs, "createFile");
  const onExternalDrop = vi.fn();
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" onExternalDrop={onExternalDrop} />
    </HostProvider>,
  );
  await screen.findByText("README.md");
  const file = fakeFile("drop.png", [1]);
  fireEvent.drop(screen.getByRole("tree"), { dataTransfer: { files: [file], items: [], types: ["Files"] } });
  expect(onExternalDrop).toHaveBeenCalledTimes(1);
  expect(createSpy).not.toHaveBeenCalled();
});

test("reveal(path) expands ancestors and selects the entry", async () => {
  const host = createMemoryHost({
    "/proj/src/deep/nested.ts": "n",
    "/proj/README.md": "z",
  });
  const actionsRef = { current: null } as React.RefObject<import("./FileExplorer").FileExplorerActions | null>;
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" actionsRef={actionsRef} />
    </HostProvider>,
  );
  await screen.findByText("src");
  expect(screen.queryByText("nested.ts")).not.toBeInTheDocument(); // collapsed
  actionsRef.current!.reveal("/proj/src/deep/nested.ts");
  // The row can render a tick before the reveal effect applies the selection
  // (expansion and reveal-seq may land in separate act flushes) — poll for it.
  const row = (await screen.findByText("nested.ts")).closest('[role="treeitem"]');
  await waitFor(() => expect(row).toHaveAttribute("aria-selected", "true"));
});

// ── rootNode: fixed project row above the tree ──

function setupRootNode(opts: { onRename?: (name: string) => void } = {}) {
  const host = createMemoryHost({
    "/proj/src/main.tsx": "x",
    "/proj/README.md": "z",
  });
  render(
    <HostProvider host={host}>
      <FileExplorer root="/proj" rootNode={{ label: "My Project", onRename: opts.onRename }} />
    </HostProvider>,
  );
  return host;
}

test("rootNode renders a fixed root row, expanded by default, with entries nested under it", async () => {
  setupRootNode();
  expect(await screen.findByText("My Project")).toBeInTheDocument();
  // children visible without any interaction (root defaults to expanded)
  expect(screen.getByText("src")).toBeInTheDocument();
  expect(screen.getByText("README.md")).toBeInTheDocument();
  // the root row sits at depth 0, entries indent one level deeper (paddingLeft = depth * indent)
  const rootRow = screen.getByText("My Project").closest('[role="treeitem"]') as HTMLElement;
  const childRow = screen.getByText("README.md").closest('[role="treeitem"]') as HTMLElement;
  expect(parseInt(childRow.style.paddingLeft || "0")).toBeGreaterThan(parseInt(rootRow.style.paddingLeft || "0"));
});

test("collapsing the root row hides the whole tree", async () => {
  setupRootNode();
  await screen.findByText("README.md");
  // the root is the only expanded row, so the only Collapse twistie is its
  await userEvent.click(screen.getByRole("button", { name: "Collapse" }));
  expect(screen.queryByText("README.md")).not.toBeInTheDocument();
  expect(screen.getByText("My Project")).toBeInTheDocument();
});

test("root context menu has folder verbs but never Cut/Copy/Delete; Rename only with onRename", async () => {
  setupRootNode(); // no onRename
  fireEvent.contextMenu(await screen.findByText("My Project"));
  expect(await screen.findByText("New File…")).toBeInTheDocument();
  expect(screen.getByText("New Folder…")).toBeInTheDocument();
  expect(screen.getByText("Copy Path")).toBeInTheDocument();
  expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  expect(screen.queryByText("Cut")).not.toBeInTheDocument();
  expect(screen.queryByText("Copy")).not.toBeInTheDocument();
  expect(screen.queryByText("Rename…")).not.toBeInTheDocument();
});

test("root Rename edits the LABEL: fires onRename, never touches the fs", async () => {
  const onRename = vi.fn();
  const host = setupRootNode({ onRename });
  const renameSpy = vi.spyOn(host.fs, "rename");
  fireEvent.contextMenu(await screen.findByText("My Project"));
  await userEvent.click(await screen.findByText("Rename…"));
  const input = await screen.findByDisplayValue("My Project");
  await userEvent.clear(input);
  await userEvent.type(input, "Zarha{Enter}");
  expect(onRename).toHaveBeenCalledWith("Zarha");
  expect(renameSpy).not.toHaveBeenCalled();
});

test("committing an EMPTY root rename still fires onRename (host clears back to default)", async () => {
  const onRename = vi.fn();
  setupRootNode({ onRename });
  fireEvent.contextMenu(await screen.findByText("My Project"));
  await userEvent.click(await screen.findByText("Rename…"));
  const input = await screen.findByDisplayValue("My Project");
  await userEvent.clear(input);
  await userEvent.type(input, "{Enter}");
  expect(onRename).toHaveBeenCalledWith("");
});

test("Delete key on the root row is a no-op", async () => {
  const host = setupRootNode();
  const deleteSpy = vi.spyOn(host.fs, "delete");
  const rootLabel = await screen.findByText("My Project");
  await userEvent.click(rootLabel); // selects (and, VS Code-style, toggles) the root row
  fireEvent.keyDown(rootLabel.closest('[role="tree"]')!, { key: "Delete" });
  expect(deleteSpy).not.toHaveBeenCalled();
  // the row survived; re-expanding shows the intact tree
  await userEvent.click(screen.getByText("My Project"));
  expect(await screen.findByText("README.md")).toBeInTheDocument();
  expect(deleteSpy).not.toHaveBeenCalled();
});

test("New File from the root row's menu creates at the top level", async () => {
  const host = setupRootNode();
  const createSpy = vi.spyOn(host.fs, "createFile");
  fireEvent.contextMenu(await screen.findByText("My Project"));
  await userEvent.click(await screen.findByText("New File…"));
  const input = await screen.findByRole("textbox");
  await userEvent.type(input, "notes.txt{Enter}");
  expect(createSpy).toHaveBeenCalledWith("/proj/notes.txt", "");
});

test("every row's icon sits in a fixed-width box so text aligns across icon types", async () => {
  const host = createMemoryHost({ "/proj/a.lmb": "x", "/proj/b.png": "y" });
  render(
    <HostProvider host={host}>
      <FileExplorer
        root="/proj"
        // wildly different intrinsic widths — the slot must normalize them
        getIcon={(e) => (e.name.endsWith(".lmb") ? <svg width={40} height={10} /> : <svg width={8} height={8} />)}
      />
    </HostProvider>,
  );
  const a = (await screen.findByText("a.lmb")).previousElementSibling as HTMLElement;
  const b = screen.getByText("b.png").previousElementSibling as HTMLElement;
  expect(a.className).toContain("w-[1.5em]");
  expect(b.className).toContain("w-[1.5em]");
});
