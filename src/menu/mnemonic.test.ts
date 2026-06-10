import { parseMnemonic } from "./mnemonic";

test("&&File marks F at index 0", () => {
  expect(parseMnemonic("&&File")).toEqual({ text: "File", index: 0, key: "F" });
});

test("Save &&As marks A", () => {
  expect(parseMnemonic("Save &&As")).toEqual({ text: "Save As", index: 5, key: "A" });
});

test("no mnemonic when there is no &&", () => {
  expect(parseMnemonic("Help")).toEqual({ text: "Help", index: -1, key: null });
});
