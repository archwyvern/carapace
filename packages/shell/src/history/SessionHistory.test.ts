import { describe, expect, test, vi } from "vitest";
import { SessionHistory } from "./SessionHistory";

/** A tiny simulated "world" of entities the history restores into, mirroring a real consumer. */
function makeWorld(initial: Record<string, string>) {
  const world = { ...initial };
  const applied: Array<[string, string]> = [];
  const history = new SessionHistory<string>({
    apply: (id, snap) => { world[id] = snap; applied.push([id, snap]); },
  });
  for (const [id, snap] of Object.entries(initial)) history.setBaseline(id, snap);
  const edit = (id: string, snap: string) => { world[id] = snap; history.record(id, snap); };
  return { world, applied, history, edit };
}

describe("SessionHistory", () => {
  test("undo/redo walk one timeline across multiple entities in chronological order", async () => {
    const { world, history, edit } = makeWorld({ a: "a0", b: "b0" });
    edit("a", "a1");
    edit("b", "b1");
    edit("a", "a2");

    await history.undo(); expect(world.a).toBe("a1"); // last edit (a)
    await history.undo(); expect(world.b).toBe("b0"); // then b
    await history.undo(); expect(world.a).toBe("a0"); // then the first a edit
    expect(await history.undo()).toBeNull();
    expect(world).toEqual({ a: "a0", b: "b0" });

    await history.redo(); expect(world.a).toBe("a1");
    await history.redo(); expect(world.b).toBe("b1");
    await history.redo(); expect(world.a).toBe("a2");
    expect(await history.redo()).toBeNull();
  });

  test("undo returns the id it restored (for reveal)", async () => {
    const { history, edit } = makeWorld({ a: "a0", b: "b0" });
    edit("a", "a1");
    edit("b", "b1");
    expect(await history.undo()).toBe("b");
    expect(await history.undo()).toBe("a");
  });

  test("an unchanged record is a no-op", () => {
    const { history, edit } = makeWorld({ a: "a0" });
    edit("a", "a1");
    expect(history.canUndo).toBe(true);
    const v = history.version;
    history.record("a", "a1"); // same as baseline now
    expect(history.version).toBe(v);
  });

  test("a record before a baseline just tracks; the next change creates the first entry", () => {
    const { history } = makeWorld({});
    history.record("c", "c0"); // no baseline yet -> establishes one, no entry
    expect(history.canUndo).toBe(false);
    history.record("c", "c1");
    expect(history.canUndo).toBe(true);
  });

  test("a new record clears the redo stack", async () => {
    const { history, edit } = makeWorld({ a: "a0" });
    edit("a", "a1");
    await history.undo();
    expect(history.canRedo).toBe(true);
    edit("a", "a9");
    expect(history.canRedo).toBe(false);
  });

  test("re-recording the just-applied state after undo doesn't create a spurious entry", async () => {
    const { world, history, edit } = makeWorld({ a: "a0" });
    edit("a", "a1");
    await history.undo();                  // baseline moves to "a0" before apply
    expect(history.canRedo).toBe(true);
    history.record("a", world.a!);         // the consumer's debounced save re-records "a0"
    expect(history.canRedo).toBe(true);    // no new entry -> redo survives
    expect(history.canUndo).toBe(false);
  });

  test("notifies subscribers and bumps version", async () => {
    const { history, edit } = makeWorld({ a: "a0" });
    const fn = vi.fn();
    history.subscribe(fn);
    edit("a", "a1");
    expect(fn).toHaveBeenCalledTimes(1);
    await history.undo();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("respects the undo-depth limit", () => {
    const world = { a: "0" };
    const history = new SessionHistory<string>({ apply: (_id, s) => { world.a = s; }, limit: 3 });
    history.setBaseline("a", "0");
    for (let i = 1; i <= 5; i++) history.record("a", String(i));
    // only the last 3 deltas are retained
    let count = 0;
    while (history.canUndo) { void history.undo(); count++; }
    expect(count).toBe(3);
  });
});
