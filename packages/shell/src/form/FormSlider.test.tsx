import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormSlider } from "./FormSlider";

test("renders the label and the value", () => {
  render(<FormSlider label="Opacity" value={0.5} min={0} max={1} onChange={() => {}} />);
  expect(screen.getByText("Opacity")).toBeInTheDocument();
  expect(screen.getByText("0.5")).toBeInTheDocument();
});

test("arrow-stepping the slider reports a change", async () => {
  const onChange = vi.fn();
  render(<FormSlider label="Opacity" value={0.5} min={0} max={1} onChange={onChange} />);
  screen.getByText("0.5").closest("div")!.focus();
  await userEvent.keyboard("{ArrowUp}");
  expect(onChange).toHaveBeenCalledWith(0.51); // universal float step = 0.01
});
