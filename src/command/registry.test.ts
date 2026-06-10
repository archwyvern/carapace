import { createCommandRegistry } from "./registry";
import type { Command } from "./registry";

function cmd(id: string, run: () => void = () => {}, extra: Partial<Command> = {}): Command {
  return { id, label: id, run, ...extra };
}

test("register then get returns the command", () => {
  const r = createCommandRegistry();
  const c = cmd("file.new");
  r.register(c);
  expect(r.get("file.new")).toBe(c);
});

test("all lists every registered command", () => {
  const r = createCommandRegistry([cmd("a"), cmd("b")]);
  expect(r.all().map((c) => c.id).sort()).toEqual(["a", "b"]);
});

test("run invokes the command", () => {
  const run = vi.fn();
  const r = createCommandRegistry([cmd("x", run)]);
  r.run("x");
  expect(run).toHaveBeenCalledTimes(1);
});

test("run respects isEnabled", () => {
  const run = vi.fn();
  const r = createCommandRegistry([cmd("x", run, { isEnabled: () => false })]);
  r.run("x");
  expect(run).not.toHaveBeenCalled();
  expect(r.isEnabled("x")).toBe(false);
});

test("unregister removes the command", () => {
  const r = createCommandRegistry();
  const unregister = r.register(cmd("x"));
  unregister();
  expect(r.get("x")).toBeUndefined();
});

test("registering the same id overwrites", () => {
  const r = createCommandRegistry();
  const second = cmd("x");
  r.register(cmd("x"));
  r.register(second);
  expect(r.get("x")).toBe(second);
});
