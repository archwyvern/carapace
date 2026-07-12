import { describe, expect, test, vi } from "vitest";
import { History } from "./History";

describe("History", () => {
  test("commit pushes undo entries; undo/redo step through them", () => {
    const h = new History("a");
    expect(h.canUndo).toBe(false);
    h.commit("b");
    h.commit("c");
    expect(h.current).toBe("c");
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);

    expect(h.undo()).toBe("b");
    expect(h.current).toBe("b");
    expect(h.canRedo).toBe(true);
    expect(h.undo()).toBe("a");
    expect(h.undo()).toBeNull(); // nothing left

    expect(h.redo()).toBe("b");
    expect(h.redo()).toBe("c");
    expect(h.redo()).toBeNull();
  });

  test("a commit after undo clears the redo stack", () => {
    const h = new History("a");
    h.commit("b");
    h.undo();
    expect(h.canRedo).toBe(true);
    h.commit("x");
    expect(h.canRedo).toBe(false);
    expect(h.current).toBe("x");
  });

  test("equal commits are no-ops", () => {
    const h = new History("a");
    h.commit("a");
    expect(h.canUndo).toBe(false);
  });

  test("coalesced commits fold into one undo entry until endGesture", () => {
    const h = new History("a");
    h.commit("b", { coalesce: "drag" });
    h.commit("c", { coalesce: "drag" });
    h.commit("d", { coalesce: "drag" });
    expect(h.current).toBe("d");
    // one undo entry for the whole gesture: jumps straight back to the pre-gesture state
    expect(h.undo()).toBe("a");

    h.reset("a");
    h.commit("b", { coalesce: "drag" });
    h.endGesture();
    h.commit("c", { coalesce: "drag" }); // new gesture -> new entry
    expect(h.undo()).toBe("b");
  });

  test("notifies subscribers and bumps version on change", () => {
    const h = new History(0);
    const fn = vi.fn();
    const unsub = h.subscribe(fn);
    h.commit(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(h.version).toBe(1);
    h.undo();
    expect(fn).toHaveBeenCalledTimes(2);
    unsub();
    h.commit(2);
    expect(fn).toHaveBeenCalledTimes(2); // unsubscribed
  });
});
