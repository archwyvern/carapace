import { fireEvent, render, screen } from "@testing-library/react";
import { ColorPicker } from "./ColorPicker";

test("renders the mode tabs and the hex value", () => {
  render(<ColorPicker value={[1, 0, 0]} onChange={() => {}} />);
  expect(screen.getByRole("button", { name: "RGB" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "HSV" })).toBeInTheDocument();
  expect(screen.getByDisplayValue("ff0000")).toBeInTheDocument();
});

test("typing a hex value emits the colour", () => {
  const onChange = vi.fn();
  render(<ColorPicker value={[1, 0, 0]} onChange={onChange} />);
  fireEvent.change(screen.getByDisplayValue("ff0000"), { target: { value: "00ff00" } });
  expect(onChange).toHaveBeenCalled();
  const last = onChange.mock.calls.at(-1)![0];
  expect(last[1]).toBeCloseTo(1, 5);
});
