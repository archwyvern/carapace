import {
  findFirstChildIndex,
  findNextFocusable,
  findParentIndex,
  findPrevFocusable,
  flattenVisible,
} from "./treeModel";
import type { TreeNode } from "./treeTypes";

const tree: TreeNode<string>[] = [
  {
    id: "a",
    data: "a",
    children: [
      { id: "a1", data: "a1" },
      { id: "a2", data: "a2", children: [{ id: "a2x", data: "a2x" }] },
    ],
  },
  { id: "b", data: "b" },
];

test("flattenVisible hides collapsed children", () => {
  expect(flattenVisible(tree, new Set()).map((f) => f.node.id)).toEqual(["a", "b"]);
});

test("flattenVisible reveals expanded children", () => {
  expect(flattenVisible(tree, new Set(["a"])).map((f) => f.node.id)).toEqual(["a", "a1", "a2", "b"]);
});

test("flattenVisible reveals nested expanded children with depth", () => {
  const flat = flattenVisible(tree, new Set(["a", "a2"]));
  expect(flat.map((f) => f.node.id)).toEqual(["a", "a1", "a2", "a2x", "b"]);
  expect(flat[3]!.depth).toBe(2);
});

test("findParentIndex finds the parent row, -1 for roots", () => {
  const flat = flattenVisible(tree, new Set(["a"]));
  expect(findParentIndex(flat, 1)).toBe(0);
  expect(findParentIndex(flat, 0)).toBe(-1);
});

test("findFirstChildIndex finds the first child of an expanded node", () => {
  const flat = flattenVisible(tree, new Set(["a"]));
  expect(findFirstChildIndex(flat, 0)).toBe(1);
  expect(findFirstChildIndex(flat, 1)).toBe(-1);
});

test("findNextFocusable / findPrevFocusable wrap", () => {
  expect(findNextFocusable(3, 2)).toBe(0);
  expect(findPrevFocusable(3, 0)).toBe(2);
});
