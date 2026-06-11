import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuList } from "./MenuList";
import type { MenuItem } from "./model";
import { CommandProvider } from "../command/context";
import { createCommandRegistry } from "../command/registry";

const items: MenuItem[] = [
  { id: "new", label: "New", shortcut: "Ctrl+N", run: () => {} },
  { separator: true },
  { id: "del", label: "Delete", enabled: false, run: () => {} },
  { label: "Open Recent", items: [{ id: "r1", label: "project-a", run: () => {} }] },
];

test("renders actions, a separator, and a submenu", () => {
  render(<MenuList items={items} onClose={() => {}} />);
  expect(screen.getByRole("menu")).toBeInTheDocument();
  expect(screen.getByText("New")).toBeInTheDocument();
  expect(screen.getByText("Ctrl+N")).toBeInTheDocument();
  expect(screen.getByRole("separator")).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: /Open Recent/ })).toBeInTheDocument();
});

test("clicking an action runs it and calls onClose", async () => {
  const run = vi.fn();
  const onClose = vi.fn();
  render(<MenuList items={[{ id: "x", label: "X", run }]} onClose={onClose} />);
  await userEvent.click(screen.getByText("X"));
  expect(run).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
});

test("a disabled action does not run", async () => {
  const run = vi.fn();
  render(<MenuList items={[{ id: "d", label: "Del", enabled: false, run }]} onClose={() => {}} />);
  await userEvent.click(screen.getByRole("menuitem", { name: "Del" }));
  expect(run).not.toHaveBeenCalled();
});

test("hovering a submenu reveals its children", async () => {
  render(<MenuList items={items} onClose={() => {}} />);
  await userEvent.hover(screen.getByRole("menuitem", { name: /Open Recent/ }));
  expect(screen.getByText("project-a")).toBeInTheDocument();
});

test("resolves command refs via the registry", () => {
  const registry = createCommandRegistry([
    { id: "file.save", label: "Save", keybinding: "Ctrl+S", run: () => {} },
  ]);
  render(
    <CommandProvider registry={registry}>
      <MenuList items={[{ command: "file.save" }]} onClose={() => {}} />
    </CommandProvider>,
  );
  expect(screen.getByText("Save")).toBeInTheDocument();
  expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
});
