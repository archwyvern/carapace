import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuBar } from "./MenuBar";
import { CommandProvider } from "../command/context";
import { createCommandRegistry } from "../command/registry";
import type { MenuModel } from "../menu/model";

test("a command-ref renders the command label + shortcut and runs it", async () => {
  const run = vi.fn();
  const registry = createCommandRegistry([
    { id: "file.new", label: "New File", keybinding: "Ctrl+N", run },
  ]);
  const menu: MenuModel = [{ label: "&&File", items: [{ command: "file.new" }] }];
  render(
    <CommandProvider registry={registry}>
      <MenuBar menu={menu} />
    </CommandProvider>,
  );
  await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
  expect(screen.getByText("New File")).toBeInTheDocument();
  expect(screen.getByText("Ctrl+N")).toBeInTheDocument();
  await userEvent.click(screen.getByText("New File"));
  expect(run).toHaveBeenCalledTimes(1);
});

test("a disabled command-ref is not run", async () => {
  const run = vi.fn();
  const registry = createCommandRegistry([
    { id: "file.new", label: "New File", isEnabled: () => false, run },
  ]);
  const menu: MenuModel = [{ label: "&&File", items: [{ command: "file.new" }] }];
  render(
    <CommandProvider registry={registry}>
      <MenuBar menu={menu} />
    </CommandProvider>,
  );
  await userEvent.click(screen.getByRole("menuitem", { name: "File" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "New File" }));
  expect(run).not.toHaveBeenCalled();
});
