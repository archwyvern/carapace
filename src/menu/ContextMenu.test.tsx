import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextMenu, useContextMenu } from "./ContextMenu";
import type { MenuItem } from "./model";

const items: MenuItem[] = [
  { id: "cut", label: "Cut", run: () => {} },
  { id: "copy", label: "Copy", run: () => {} },
  { separator: true },
  { id: "del", label: "Delete", enabled: false, run: () => {} },
];

test("renders the items in a menu", () => {
  render(<ContextMenu items={items} x={10} y={10} onClose={() => {}} />);
  expect(screen.getByRole("menu")).toBeInTheDocument();
  expect(screen.getByText("Cut")).toBeInTheDocument();
  expect(screen.getByText("Copy")).toBeInTheDocument();
});

test("clicking an item runs it and closes", async () => {
  const run = vi.fn();
  const onClose = vi.fn();
  render(<ContextMenu items={[{ id: "x", label: "X", run }]} x={0} y={0} onClose={onClose} />);
  await userEvent.click(screen.getByText("X"));
  expect(run).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
});

test("a disabled item does not run", async () => {
  const run = vi.fn();
  render(<ContextMenu items={[{ id: "d", label: "Del", enabled: false, run }]} x={0} y={0} onClose={() => {}} />);
  await userEvent.click(screen.getByRole("menuitem", { name: "Del" }));
  expect(run).not.toHaveBeenCalled();
});

test("Escape closes", async () => {
  const onClose = vi.fn();
  render(<ContextMenu items={items} x={0} y={0} onClose={onClose} />);
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalled();
});

test("clicking outside closes", async () => {
  const onClose = vi.fn();
  render(<ContextMenu items={items} x={0} y={0} onClose={onClose} />);
  await userEvent.click(document.body);
  expect(onClose).toHaveBeenCalled();
});

function Harness() {
  const { state, open, close } = useContextMenu();
  return (
    <div>
      <div data-testid="target" onContextMenu={open}>
        target
      </div>
      {state && (
        <ContextMenu
          items={[{ id: "a", label: "A", run: () => {} }]}
          x={state.x}
          y={state.y}
          onClose={close}
        />
      )}
    </div>
  );
}

test("useContextMenu opens a menu on right-click", () => {
  render(<Harness />);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  fireEvent.contextMenu(screen.getByTestId("target"), { clientX: 5, clientY: 5 });
  expect(screen.getByRole("menu")).toBeInTheDocument();
  expect(screen.getByText("A")).toBeInTheDocument();
});
