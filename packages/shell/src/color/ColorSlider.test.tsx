import { fireEvent, render, screen } from "@testing-library/react";
import { ColorSlider } from "./ColorSlider";

test("renders the label and numeric input; editing reports the value", () => {
  const onChange = vi.fn();
  render(
    <ColorSlider
      label="H"
      value={180}
      min={0}
      max={360}
      step={1}
      color="#fff"
      gradient={[
        [1, 0, 0],
        [0, 0, 1],
      ]}
      onChange={onChange}
    />,
  );
  expect(screen.getByText("H")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "200" } });
  expect(onChange).toHaveBeenCalledWith(200);
});
