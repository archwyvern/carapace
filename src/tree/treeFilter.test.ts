import { treeFilter } from "./treeFilter";
import type { TreeNode } from "./treeTypes";

const tree: TreeNode<string>[] = [
  {
    id: "src",
    data: "src",
    children: [
      { id: "main.tsx", data: "main.tsx" },
      { id: "util.ts", data: "util.ts" },
    ],
  },
  { id: "readme", data: "README.md" },
];

const text = (n: TreeNode<string>) => n.data;

test("an empty query returns the original roots", () => {
  expect(treeFilter(tree, "  ", text)).toBe(tree);
});

test("matches by substring, keeping the ancestor chain", () => {
  const r = treeFilter(tree, "main", text);
  expect(r.map((n) => n.id)).toEqual(["src"]);
  expect(r[0]!.children!.map((n) => n.id)).toEqual(["main.tsx"]);
});

test("a matching folder keeps its whole subtree", () => {
  const r = treeFilter(tree, "src", text);
  expect(r[0]!.children!.map((n) => n.id)).toEqual(["main.tsx", "util.ts"]);
});

test("no matches returns an empty list", () => {
  expect(treeFilter(tree, "zzz", text)).toEqual([]);
});
