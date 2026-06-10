import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./CommandPalette";
import { CommandProvider } from "./context";
import { createCommandRegistry } from "./registry";

function setup(open = true, onClose: () => void = () => {}, run = vi.fn()) {
  const registry = createCommandRegistry([
    { id: "file.new", label: "New File", category: "File", keybinding: "Ctrl+N", run },
    { id: "file.save", label: "Save", category: "File", run: () => {} },
    { id: "view.zoom", label: "Zoom In", category: "View", run: () => {} },
  ]);
  render(
    <CommandProvider registry={registry}>
      <CommandPalette open={open} onClose={onClose} />
    </CommandProvider>,
  );
  return { run };
}

test("renders nothing when closed", () => {
  setup(false);
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

test("lists every enabled command when open", () => {
  setup(true);
  expect(screen.getByText("New File")).toBeInTheDocument();
  expect(screen.getByText("Save")).toBeInTheDocument();
  expect(screen.getByText("Zoom In")).toBeInTheDocument();
});

test("typing filters the list", async () => {
  setup(true);
  await userEvent.type(screen.getByRole("textbox"), "zoom");
  expect(screen.getByText("Zoom In")).toBeInTheDocument();
  expect(screen.queryByText("New File")).not.toBeInTheDocument();
});

test("clicking a result runs it and closes", async () => {
  const onClose = vi.fn();
  const run = vi.fn();
  setup(true, onClose, run);
  await userEvent.click(screen.getByText("New File"));
  expect(run).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("Enter runs the highlighted command", async () => {
  const onClose = vi.fn();
  const run = vi.fn();
  setup(true, onClose, run);
  await userEvent.type(screen.getByRole("textbox"), "{Enter}");
  expect(run).toHaveBeenCalledTimes(1);
});

test("Escape closes the palette", async () => {
  const onClose = vi.fn();
  setup(true, onClose);
  await userEvent.type(screen.getByRole("textbox"), "{Escape}");
  expect(onClose).toHaveBeenCalledTimes(1);
});
