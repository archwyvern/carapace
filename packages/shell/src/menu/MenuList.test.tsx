import { describe, expect, it, vi } from "vitest";
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

describe("MenuList shim", () => {
  it("renders actions, a separator, and a submenu parent", async () => {
    render(<MenuList items={items} onClose={() => {}} />);
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+N")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Open Recent/ })).toBeInTheDocument();
  });

  it("clicking an action runs it and calls onClose", async () => {
    const run = vi.fn();
    const onClose = vi.fn();
    render(<MenuList items={[{ id: "x", label: "X", run }]} onClose={onClose} />);
    await userEvent.click(await screen.findByText("X"));
    expect(run).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("a disabled action does not run", async () => {
    const run = vi.fn();
    render(<MenuList items={[{ id: "d", label: "Del", enabled: false, run }]} onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Del" }));
    expect(run).not.toHaveBeenCalled();
  });

  it("hovering a submenu reveals its children", async () => {
    render(<MenuList items={items} onClose={() => {}} />);
    await userEvent.hover(await screen.findByRole("menuitem", { name: /Open Recent/ }));
    expect(await screen.findByText("project-a")).toBeInTheDocument();
  });

  it("resolves command refs via the registry", async () => {
    const registry = createCommandRegistry([
      { id: "file.save", label: "Save", keybinding: "Ctrl+S", run: () => {} },
    ]);
    render(
      <CommandProvider registry={registry}>
        <MenuList items={[{ command: "file.save" }]} onClose={() => {}} />
      </CommandProvider>,
    );
    expect(await screen.findByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
  });
});
