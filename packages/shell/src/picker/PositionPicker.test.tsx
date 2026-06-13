import { fireEvent, render, screen } from "@testing-library/react";
import { PositionPicker } from "./PositionPicker";

test("renders the label, readout, and hint", () => {
  render(<PositionPicker label="Pos" value={{ x: 0, y: 0 }} onChange={() => {}} />);
  expect(screen.getByText("Pos")).toBeInTheDocument();
  expect(screen.getByText("0.00, 0.00")).toBeInTheDocument();
  expect(screen.getByText("Click to set position")).toBeInTheDocument();
});

test("ArrowDown nudges y", () => {
  const onChange = vi.fn();
  const { container } = render(<PositionPicker value={{ x: 0, y: 0 }} onChange={onChange} />);
  fireEvent.keyDown(container.querySelector("canvas")!, { key: "ArrowDown" });
  expect(onChange).toHaveBeenCalledWith({ x: 0, y: 0.05 });
});
