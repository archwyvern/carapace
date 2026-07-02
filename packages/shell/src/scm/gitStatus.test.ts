import { parseGitPorcelainZ, scmDecoration } from "./gitStatus";

test("parses modified / untracked / deleted entries (NUL-terminated)", () => {
  const out = " M src/a.ts\0?? new file.png\0 D gone.md\0";
  expect(parseGitPorcelainZ(out)).toEqual([
    { x: " ", y: "M", path: "src/a.ts" },
    { x: "?", y: "?", path: "new file.png" },
    { x: " ", y: "D", path: "gone.md" },
  ]);
});

test("renames carry the original path in the following field", () => {
  const out = "R  new/name.ts\0old/name.ts\0 M other.ts\0";
  expect(parseGitPorcelainZ(out)).toEqual([
    { x: "R", y: " ", path: "new/name.ts", renamedFrom: "old/name.ts" },
    { x: " ", y: "M", path: "other.ts" },
  ]);
});

test("empty output = clean tree", () => {
  expect(parseGitPorcelainZ("")).toEqual([]);
});

test("decorations map to the conventional SCM colours", () => {
  expect(scmDecoration(" ", "M")!.badge).toBe("M");
  expect(scmDecoration("?", "?")!.badge).toBe("U");
  expect(scmDecoration("A", " ")!.badge).toBe("A");
  expect(scmDecoration(" ", "D")!.badge).toBe("D");
  expect(scmDecoration("R", " ")!.badge).toBe("R");
  expect(scmDecoration("U", "U")!.badge).toBe("C");
  expect(scmDecoration(" ", " ")).toBeUndefined();
});
