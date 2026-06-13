import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutOverlay } from "./ShortcutOverlay";
import { CommandProvider } from "./context";
import { createCommandRegistry } from "./registry";

function wrap(open: boolean, onClose: () => void = () => {}) {
  const registry = createCommandRegistry([
    { id: "file.new", label: "New File", category: "File", keybinding: "Ctrl+N", run: () => {} },
    { id: "file.save", label: "Save", category: "File", keybinding: "Ctrl+S", run: () => {} },
    { id: "misc.x", label: "No Shortcut", category: "Misc", run: () => {} },
  ]);
  return render(
    <CommandProvider registry={registry}>
      <ShortcutOverlay open={open} onClose={onClose} />
    </CommandProvider>,
  );
}

test("renders nothing when closed", () => {
  wrap(false);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("lists commands with keybindings, grouped, skipping those without", () => {
  wrap(true);
  expect(screen.getByText("New File")).toBeInTheDocument();
  expect(screen.getByText("Ctrl+N")).toBeInTheDocument();
  expect(screen.getByText("File")).toBeInTheDocument();
  expect(screen.queryByText("No Shortcut")).not.toBeInTheDocument();
});

test("Escape closes", async () => {
  const onClose = vi.fn();
  wrap(true, onClose);
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalled();
});

test("clicking the backdrop closes", async () => {
  const onClose = vi.fn();
  const { container } = wrap(true, onClose);
  await userEvent.click(container.firstChild as HTMLElement);
  expect(onClose).toHaveBeenCalled();
});
