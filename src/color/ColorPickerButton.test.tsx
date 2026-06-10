import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ColorPickerButton } from "./ColorPickerButton";

test("renders a swatch and opens the picker on click", async () => {
  render(<ColorPickerButton value={[1, 0, 0]} onChange={() => {}} />);
  const swatch = screen.getByRole("button", { name: "Pick colour" });
  expect(swatch).toBeInTheDocument();
  await userEvent.click(swatch);
  // The picker opened in a portal — its hex input shows the value.
  expect(screen.getByDisplayValue("ff0000")).toBeInTheDocument();
});
