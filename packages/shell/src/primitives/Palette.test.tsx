import { fireEvent, render, screen } from "@testing-library/react";
import { Palette } from "./Palette";

const groups = [{ label: "Shapes", items: [{ id: "sphere", label: "Sphere" }] }];

test("renders group labels and iconless tiles as text", () => {
  render(<Palette groups={groups} />);
  expect(screen.getByText("Shapes")).toBeInTheDocument();
  expect(screen.getByText("Sphere")).toBeInTheDocument();
});

test("onPick fires per pickOn mode", () => {
  const onPick = vi.fn();
  const { rerender } = render(<Palette groups={groups} onPick={onPick} />);
  fireEvent.click(screen.getByTitle("Sphere"));
  expect(onPick).toHaveBeenCalledWith("sphere");
  onPick.mockClear();
  rerender(<Palette groups={groups} onPick={onPick} pickOn="doubleClick" />);
  fireEvent.click(screen.getByTitle("Sphere"));
  expect(onPick).not.toHaveBeenCalled();
  fireEvent.doubleClick(screen.getByTitle("Sphere"));
  expect(onPick).toHaveBeenCalledWith("sphere");
});

test("onItemContextMenu fires with the item id and suppresses the default menu", () => {
  const onMenu = vi.fn();
  render(<Palette groups={groups} onItemContextMenu={onMenu} />);
  const prevented = !fireEvent.contextMenu(screen.getByTitle("Sphere"));
  expect(onMenu).toHaveBeenCalledWith("sphere", expect.anything());
  expect(prevented).toBe(true); // preventDefault ran
});
