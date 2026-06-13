import { fireEvent, render, screen } from "@testing-library/react";
import { FormVec } from "./FormVec";

test("renders one number input per axis with the values", () => {
  render(<FormVec label="Pos" value={[1, 2, 3]} size={3} onChange={() => {}} />);
  expect(screen.getByText("Pos")).toBeInTheDocument();
  const inputs = screen.getAllByRole("spinbutton");
  expect(inputs).toHaveLength(3);
  expect(inputs[0]).toHaveValue(1);
});

test("editing an axis reports the updated array", () => {
  const onChange = vi.fn();
  render(<FormVec label="Pos" value={[1, 2]} size={2} onChange={onChange} />);
  fireEvent.change(screen.getAllByRole("spinbutton")[1]!, { target: { value: "9" } });
  expect(onChange).toHaveBeenCalledWith([1, 9]);
});
