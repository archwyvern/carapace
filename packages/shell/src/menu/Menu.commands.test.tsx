import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./Menu";
import { CommandProvider } from "../command/context";
import { createCommandRegistry } from "../command/registry";
import type { MenuItem } from "./model";

describe("command-ref resolution in Menu", () => {
  it("resolves label, shortcut, enabled, and runs", async () => {
    const run = vi.fn();
    const reg = createCommandRegistry([
      { id: "file.save", label: "Save", keybinding: "Ctrl+S", run },
      { id: "edit.undo", label: "Undo", isEnabled: () => false, run: () => {} },
    ]);
    const items: MenuItem[] = [{ command: "file.save" }, { command: "edit.undo" }];
    render(
      <CommandProvider registry={reg}>
        <Menu items={items} open onOpenChange={() => {}} anchor={{ x: 0, y: 0 }} ariaLabel="t" />
      </CommandProvider>,
    );
    expect(await screen.findByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
    expect(screen.getByText("Undo").closest("[role=menuitem]")).toBeDisabled();
    await userEvent.click(screen.getByText("Save"));
    expect(run).toHaveBeenCalledOnce();
  });

  it("renders a checked command as a checkbox item", async () => {
    const reg = createCommandRegistry([
      { id: "view.wrap", label: "Word Wrap", checked: true, run: () => {} },
    ]);
    render(
      <CommandProvider registry={reg}>
        <Menu items={[{ command: "view.wrap" }]} open onOpenChange={() => {}} anchor={{ x: 0, y: 0 }} ariaLabel="t" />
      </CommandProvider>,
    );
    const item = await screen.findByRole("menuitemcheckbox");
    expect(item).toHaveAttribute("aria-checked", "true");
  });
});
