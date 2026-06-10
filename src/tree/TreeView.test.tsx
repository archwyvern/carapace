import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreeView } from "./TreeView";
import type { TreeNode, TreeViewProps } from "./treeTypes";

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
