import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormVec } from "./FormVec";

test("renders one SpinSlider axis per component, showing the values", () => {
  render(<FormVec label="Pos" value={[1, 2, 3]} size={3} onChange={() => {}} />);
  expect(screen.getByText("Pos")).toBeInTheDocument();
  expect(screen.getByText("X")).toBeInTheDocument();
  expect(screen.getByText("Y")).toBeInTheDocument();
  expect(screen.getByText("Z")).toBeInTheDocument();
  expect(screen.getByText("1")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
});

test("editing an axis reports the updated array", async () => {
  const onChange = vi.fn();
  render(<FormVec label="Pos" value={[1, 2]} size={2} onChange={onChange} />);
  screen.getByText("2").closest("div")!.focus(); // the Y axis SpinSlider
  await userEvent.keyboard("{Enter}");
  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, "9{Enter}");
  expect(onChange).toHaveBeenCalledWith([1, 9]);
});

test("onCommit fires with the full updated array", async () => {
  const onCommit = vi.fn();
  render(<FormVec label="Pos" value={[1, 2]} size={2} onChange={() => {}} onCommit={onCommit} />);
  screen.getByText("1").closest("div")!.focus(); // the X axis SpinSlider
  await userEvent.keyboard("{Enter}");
  const input = screen.getByRole("textbox");
  await userEvent.clear(input);
  await userEvent.type(input, "5{Enter}");
  expect(onCommit).toHaveBeenCalledWith([5, 2]);
});
