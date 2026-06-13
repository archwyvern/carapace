import { render, screen } from "@testing-library/react";
import { FormColor } from "./FormColor";

test("renders the label and a colour swatch", () => {
  render(<FormColor label="Tint" value={[1, 0, 0]} onChange={() => {}} />);
  expect(screen.getByText("Tint")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Tint colour" })).toBeInTheDocument();
});
