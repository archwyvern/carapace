import { render, screen } from "@testing-library/react";
import { CommandProvider, useCommandKeybindings, useCommands } from "./context";
import { createCommandRegistry } from "./registry";
import type { CommandRegistry } from "./registry";

function Probe() {
  const r = useCommands();
  return <div>{r.all().length} commands</div>;
}

function KeybindHarness({ registry }: { registry: CommandRegistry }) {
  useCommandKeybindings(registry);
  return null;
}

test("useCommands throws without a provider", () => {
  const orig = console.error;
  console.error = () => {};
  expect(() => render(<Probe />)).toThrow(/CommandProvider/);
  console.error = orig;
});

test("useCommands returns the injected registry", () => {
  const registry = createCommandRegistry([{ id: "a", label: "A", run: () => {} }]);
  render(
    <CommandProvider registry={registry}>
      <Probe />
    </CommandProvider>,
  );
  expect(screen.getByText("1 commands")).toBeInTheDocument();
});

test("a matching keybinding runs its command", () => {
  const run = vi.fn();
  const registry = createCommandRegistry([{ id: "bold", label: "Bold", keybinding: "Ctrl+B", run }]);
  render(<KeybindHarness registry={registry} />);
  document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "b" }));
  expect(run).toHaveBeenCalledTimes(1);
});

test("a non-matching key does nothing", () => {
  const run = vi.fn();
  const registry = createCommandRegistry([{ id: "bold", label: "Bold", keybinding: "Ctrl+B", run }]);
  render(<KeybindHarness registry={registry} />);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "b" }));
  expect(run).not.toHaveBeenCalled();
});
