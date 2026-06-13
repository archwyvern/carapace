import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DirectionPicker } from "./DirectionPicker";

test("renders the label, readout, and hint", () => {
  render(<DirectionPicker label="Dir" value={{ x: 0, y: 0 }} onChange={() => {}} />);
  expect(screen.getByText("Dir")).toBeInTheDocument();
  expect(screen.getByText("0.00, 0.00")).toBeInTheDocument();
  expect(screen.getByText("Click to set direction")).toBeInTheDocument();
});

test("ArrowRight nudges x", () => {
  const onChange = vi.fn();
  const { container } = render(<DirectionPicker value={{ x: 0, y: 0 }} onChange={onChange} />);
  fireEvent.keyDown(container.querySelector("canvas")!, { key: "ArrowRight" });
  expect(onChange).toHaveBeenCalledWith({ x: 0.05, y: 0 });
});

test("an active picker shows a reset button that clears the value", async () => {
  const onChange = vi.fn();
  render(<DirectionPicker value={{ x: 0.5, y: 0.5 }} onChange={onChange} />);
  await userEvent.click(screen.getByRole("button", { name: /reset to center/i }));
  expect(onChange).toHaveBeenCalledWith({ x: 0, y: 0 });
});
