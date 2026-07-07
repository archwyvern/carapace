import { createChordMatcher, matchEvent, matchStep, parseChord } from "./keybinding";

test("parses modifiers and key", () => {
  expect(parseChord("Ctrl+Shift+P").steps).toEqual([
    {
      ctrl: true,
      shift: true,
      alt: false,
      meta: false,
      key: "P",
    },
  ]);
});

test("parses named keys and modifier aliases", () => {
  expect(parseChord("Alt+F4").steps[0]).toMatchObject({ alt: true, key: "F4" });
  expect(parseChord("Cmd+k").steps[0]).toMatchObject({ meta: true, key: "K" });
});

test("matchEvent matches a chord", () => {
  const ev = new KeyboardEvent("keydown", { ctrlKey: true, key: "n" });
  expect(matchEvent(parseChord("Ctrl+N"), ev)).toBe(true);
});

test("matchEvent rejects when a modifier differs", () => {
  const ev = new KeyboardEvent("keydown", { ctrlKey: true, shiftKey: true, key: "N" });
  expect(matchEvent(parseChord("Ctrl+N"), ev)).toBe(false);
});

test("matchStep matches one step", () => {
  const ev = new KeyboardEvent("keydown", { ctrlKey: true, key: "k" });
  expect(matchStep(parseChord("Ctrl+K").steps[0]!, ev)).toBe(true);
});

describe("two-step chords", () => {
  it("parses a two-step spec", () => {
    const c = parseChord("Ctrl+K U");
    expect(c.steps).toHaveLength(2);
    expect(c.steps[0]).toMatchObject({ ctrl: true, key: "K" });
    expect(c.steps[1]).toMatchObject({ ctrl: false, key: "U" });
  });
  it("matchEvent rejects a two-step chord (stateless callers can never fire it)", () => {
    expect(matchEvent(parseChord("Ctrl+K U"), { key: "k", ctrlKey: true, shiftKey: false, altKey: false, metaKey: false })).toBe(false);
  });
});

const ev = (key: string, mods: Partial<Record<"ctrlKey" | "shiftKey" | "altKey" | "metaKey", boolean>> = {}) => ({
  key,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...mods,
});

describe("createChordMatcher", () => {
  const B = [
    { id: "close", chord: parseChord("Ctrl+W") },
    { id: "close-saved", chord: parseChord("Ctrl+K U") },
    { id: "close-all", chord: parseChord("Ctrl+K W") },
    { id: "k-alone", chord: parseChord("Ctrl+K") },
  ];
  it("runs a single-step binding", () => {
    expect(createChordMatcher().feed(B, ev("w", { ctrlKey: true }))).toEqual({ type: "run", id: "close" });
  });
  it("a prefix shadows the single-step binding on the same step and goes pending", () => {
    expect(createChordMatcher().feed(B, ev("k", { ctrlKey: true }))).toEqual({ type: "pending", prefix: "Ctrl+K" });
  });
  it("completes a chord from pending", () => {
    const m = createChordMatcher();
    m.feed(B, ev("k", { ctrlKey: true }));
    expect(m.feed(B, ev("u"))).toEqual({ type: "run", id: "close-saved" });
  });
  it("cancels pending on an unmatched second step, and is reset after", () => {
    const m = createChordMatcher();
    m.feed(B, ev("k", { ctrlKey: true }));
    expect(m.feed(B, ev("z"))).toEqual({ type: "cancel" });
    expect(m.feed(B, ev("w", { ctrlKey: true }))).toEqual({ type: "run", id: "close" });
  });
  it("cancels pending on Escape", () => {
    const m = createChordMatcher();
    m.feed(B, ev("k", { ctrlKey: true }));
    expect(m.feed(B, ev("Escape"))).toEqual({ type: "cancel" });
  });
  it("returns none for an unbound key with no pending", () => {
    expect(createChordMatcher().feed(B, ev("z"))).toEqual({ type: "none" });
  });
  it("bare-modifier keydowns don't disturb pending", () => {
    const m = createChordMatcher();
    m.feed(B, ev("k", { ctrlKey: true }));
    expect(m.feed(B, ev("Control", { ctrlKey: true }))).toEqual({ type: "none" });
    expect(m.feed(B, ev("u"))).toEqual({ type: "run", id: "close-saved" });
  });
  it("reset() clears pending", () => {
    const m = createChordMatcher();
    m.feed(B, ev("k", { ctrlKey: true }));
    m.reset();
    expect(m.feed(B, ev("u"))).toEqual({ type: "none" });
  });
});
