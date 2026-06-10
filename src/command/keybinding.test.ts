import { matchEvent, parseChord } from "./keybinding";

test("parses modifiers and key", () => {
  expect(parseChord("Ctrl+Shift+P")).toEqual({
    ctrl: true,
    shift: true,
    alt: false,
    meta: false,
    key: "P",
  });
});

test("parses named keys and modifier aliases", () => {
  expect(parseChord("Alt+F4")).toMatchObject({ alt: true, key: "F4" });
  expect(parseChord("Cmd+k")).toMatchObject({ meta: true, key: "K" });
});

test("matchEvent matches a chord", () => {
  const ev = new KeyboardEvent("keydown", { ctrlKey: true, key: "n" });
  expect(matchEvent(parseChord("Ctrl+N"), ev)).toBe(true);
});

test("matchEvent rejects when a modifier differs", () => {
  const ev = new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "N" });
  expect(matchEvent(parseChord("Ctrl+N"), ev)).toBe(false);
});
