import { humanizeLabel } from "./text";

test("camelCase splits to spaced lowercase", () => {
  expect(humanizeLabel("slopeWidth")).toBe("slope width");
  expect(humanizeLabel("radius2")).toBe("radius2");
  expect(humanizeLabel("snapToGuides")).toBe("snap to guides");
  expect(humanizeLabel("plain")).toBe("plain");
});
