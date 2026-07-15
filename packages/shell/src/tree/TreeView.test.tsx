import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreeView } from "./TreeView";
import type { TreeNode, TreeViewProps } from "./treeTypes";

const dt = () => ({ dataTransfer: { setData: () => {}, effectAllowed: "", dropEffect: "" } });
const selectedItems = () =>
  screen.getAllByRole("treeitem").filter((i) => i.getAttribute("aria-selected") === "true");

const tree: TreeNode<string>[] = [
  {
    id: "src",
    data: "src",
    children: [
      { id: "a.ts", data: "a.ts" },
      { id: "b.ts", data: "b.ts" },
    ],
  },
  { id: "readme", data: "README" },
];

function renderTree(props: Partial<TreeViewProps<string>> = {}) {
  return render(
    <TreeView roots={tree} renderItem={(ctx) => <span>{ctx.node.data}</span>} {...props} />,
  );
}

test("renders roots; collapsed children are hidden", () => {
  renderTree();
  expect(screen.getByText("src")).toBeInTheDocument();
  expect(screen.getByText("README")).toBeInTheDocument();
  expect(screen.queryByText("a.ts")).not.toBeInTheDocument();
});

test("clicking the twistie expands a node", async () => {
  renderTree();
  await userEvent.click(screen.getByRole("button", { name: "Expand" }));
  expect(screen.getByText("a.ts")).toBeInTheDocument();
  expect(screen.getByText("b.ts")).toBeInTheDocument();
});

test("clicking a row selects it", async () => {
  const onSelectionChange = vi.fn();
  renderTree({ onSelectionChange });
  await userEvent.click(screen.getByText("README"));
  expect(onSelectionChange).toHaveBeenCalled();
  expect(screen.getByText("README").closest("[role=treeitem]")).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("double-click activates a node", async () => {
  const onActivate = vi.fn();
  renderTree({ onActivate });
  await userEvent.dblClick(screen.getByText("README"));
  expect(onActivate).toHaveBeenCalledWith(expect.objectContaining({ id: "readme" }));
});

test("respects controlled expanded state", () => {
  render(
    <TreeView
      roots={tree}
      expanded={new Set(["src"])}
      renderItem={(ctx) => <span>{ctx.node.data}</span>}
    />,
  );
  expect(screen.getByText("a.ts")).toBeInTheDocument();
});

test("ArrowRight expands the focused collapsed node", async () => {
  renderTree();
  screen.getByRole("tree").focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(screen.getByText("a.ts")).toBeInTheDocument();
});

test("disableArrowKeys: arrows neither navigate nor get consumed", async () => {
  renderTree({ disableArrowKeys: true });
  screen.getByRole("tree").focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(screen.queryByText("a.ts")).not.toBeInTheDocument(); // no expand
  fireEvent.click(screen.getByText("src"));
  // fireEvent returns false when preventDefault was called — the host must
  // still receive arrow keydowns (e.g. a canvas nudge handler on window).
  expect(fireEvent.keyDown(screen.getByRole("tree"), { key: "ArrowDown" })).toBe(true);
  expect(selectedItems()).toEqual([screen.getByText("src").closest("[role=treeitem]")]);
});

test("Ctrl+click toggles rows into a multi-selection", () => {
  const onSelectedChange = vi.fn();
  renderTree({ onSelectedChange });
  fireEvent.click(screen.getByText("src"));
  fireEvent.click(screen.getByText("README"), { ctrlKey: true });
  expect(selectedItems()).toHaveLength(2);
  expect(onSelectedChange).toHaveBeenLastCalledWith([
    expect.objectContaining({ id: "src" }),
    expect.objectContaining({ id: "readme" }),
  ]);
  // Ctrl+clicking an already-selected row removes it.
  fireEvent.click(screen.getByText("src"), { ctrlKey: true });
  expect(selectedItems()).toHaveLength(1);
});

test("Shift+click selects a contiguous range", () => {
  renderTree({ defaultExpanded: new Set(["src"]) });
  // Anchor on a file (clicking a folder would toggle it and change the visible rows).
  fireEvent.click(screen.getByText("a.ts"));
  fireEvent.click(screen.getByText("README"), { shiftKey: true });
  // a.ts, b.ts, README
  expect(selectedItems()).toHaveLength(3);
});

test("single-clicking a folder toggles its expansion", () => {
  renderTree();
  expect(screen.queryByText("a.ts")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("src"));
  expect(screen.getByText("a.ts")).toBeInTheDocument();
  fireEvent.click(screen.getByText("src"));
  expect(screen.queryByText("a.ts")).not.toBeInTheDocument();
});

test("expandOnReselect: first click only selects; re-click toggles expansion", () => {
  renderTree({ expandOnReselect: true });
  expect(screen.queryByText("a.ts")).not.toBeInTheDocument();
  // First click on an unselected folder selects it WITHOUT expanding.
  fireEvent.click(screen.getByText("src"));
  expect(selectedItems()).toHaveLength(1);
  expect(screen.queryByText("a.ts")).not.toBeInTheDocument();
  // Re-clicking the now-selected folder toggles expansion.
  fireEvent.click(screen.getByText("src"));
  expect(screen.getByText("a.ts")).toBeInTheDocument();
  fireEvent.click(screen.getByText("src"));
  expect(screen.queryByText("a.ts")).not.toBeInTheDocument();
});

test("expandOnRowClick=false: row clicks never toggle; the twistie still does", () => {
  renderTree({ expandOnRowClick: false });
  expect(screen.queryByText("a.ts")).not.toBeInTheDocument();
  // Plain clicks select but never fold — no matter how many times.
  fireEvent.click(screen.getByText("src"));
  fireEvent.click(screen.getByText("src"));
  expect(selectedItems()).toHaveLength(1);
  expect(screen.queryByText("a.ts")).not.toBeInTheDocument();
  // The twistie is the only mouse path to expansion.
  fireEvent.click(screen.getByLabelText("Expand"));
  expect(screen.getByText("a.ts")).toBeInTheDocument();
});

test("editingId renders an inline input that commits on Enter and cancels on Escape", () => {
  const onEditCommit = vi.fn();
  const onEditCancel = vi.fn();
  const { rerender } = render(
    <TreeView roots={tree} renderItem={(c) => <span>{c.node.data}</span>}
      editingId="readme" editingInitial="README" onEditCommit={onEditCommit} onEditCancel={onEditCancel} />,
  );
  const input = screen.getByRole("textbox") as HTMLInputElement;
  expect(input.value).toBe("README");
  fireEvent.change(input, { target: { value: "READYOU" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onEditCommit).toHaveBeenCalledWith("READYOU");

  rerender(
    <TreeView roots={tree} renderItem={(c) => <span>{c.node.data}</span>}
      editingId="src" editingInitial="src" onEditCommit={onEditCommit} onEditCancel={onEditCancel} />,
  );
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
  expect(onEditCancel).toHaveBeenCalled();
});

test("Delete key fires onDelete with the selection; F2 fires onRename", () => {
  const onDelete = vi.fn();
  const onRename = vi.fn();
  renderTree({ onDelete, onRename });
  fireEvent.click(screen.getByText("README"));
  const tree = screen.getByRole("tree");
  fireEvent.keyDown(tree, { key: "Delete" });
  expect(onDelete).toHaveBeenCalledWith([expect.objectContaining({ id: "readme" })]);
  fireEvent.keyDown(tree, { key: "F2" });
  expect(onRename).toHaveBeenCalledWith(expect.objectContaining({ id: "readme" }));
});

test("drag-and-drop reports the dragged nodes and target via onDrop", () => {
  const onDrop = vi.fn();
  const canDrop = (_dragged: TreeNode<string>[], target: TreeNode<string> | null) => target?.id === "src";
  renderTree({ defaultExpanded: new Set(["src"]), canDrop, onDrop });
  const readme = screen.getByText("README").closest("[role=treeitem]")!;
  const src = screen.getByText("src").closest("[role=treeitem]")!;
  fireEvent.dragStart(readme, dt());
  fireEvent.dragOver(src, dt());
  fireEvent.drop(src, dt());
  expect(onDrop).toHaveBeenCalledWith(
    [expect.objectContaining({ id: "readme" })],
    expect.objectContaining({ id: "src" }),
  );
});

test("dragging a row that is part of a multi-selection drags the whole selection", () => {
  const onDrop = vi.fn();
  const canDrop = (_dragged: TreeNode<string>[], target: TreeNode<string> | null) => target?.id === "src";
  renderTree({ defaultExpanded: new Set(["src"]), canDrop, onDrop });
  fireEvent.click(screen.getByText("a.ts"));
  fireEvent.click(screen.getByText("README"), { ctrlKey: true });
  const src = screen.getByText("src").closest("[role=treeitem]")!;
  fireEvent.dragStart(screen.getByText("README").closest("[role=treeitem]")!, dt());
  fireEvent.drop(src, dt());
  expect(onDrop).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({ id: "a.ts" }),
      expect.objectContaining({ id: "readme" }),
    ]),
    expect.objectContaining({ id: "src" }),
  );
});
