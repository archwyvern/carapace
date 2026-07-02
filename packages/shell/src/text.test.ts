import { humanizeLabel, ucwords } from "./text";

test("camelCase splits to spaced lowercase", () => {
  expect(humanizeLabel("slopeWidth")).toBe("slope width");
  expect(humanizeLabel("radius2")).toBe("radius2");
  expect(humanizeLabel("snapToGuides")).toBe("snap to guides");
  expect(humanizeLabel("plain")).toBe("plain");
});

test("ucwords title-cases and is idempotent", () => {
  expect(ucwords("slope width")).toBe("Slope Width");
  expect(ucwords("anchor scale")).toBe("Anchor Scale");
  expect(ucwords("Already Cased")).toBe("Already Cased");
  expect(ucwords("x")).toBe("X");
});
