import { cx } from "./cx";

test("joins truthy class values and flattens arrays", () => {
  expect(cx("a", false, "b", null, undefined, ["c", 0, "d"])).toBe("a b c d");
});

test("returns an empty string when nothing is truthy", () => {
  expect(cx(false, null, undefined, "")).toBe("");
});
