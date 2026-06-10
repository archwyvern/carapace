import { render, screen } from "@testing-library/react";
import { Sash } from "./Sash";

test("a vertical sash renders a vertical separator", () => {
  render(<Sash orientation="vertical" onDrag={() => {}} />);
  const sash = screen.getByRole("separator");
  expect(sash).toHaveAttribute("aria-orientation", "vertical");
  expect(sash).toHaveClass("cursor-col-resize");
});

test("a horizontal sash renders a horizontal separator", () => {
  render(<Sash orientation="horizontal" onDrag={() => {}} />);
  const sash = screen.getByRole("separator");
  expect(sash).toHaveAttribute("aria-orientation", "horizontal");
  expect(sash).toHaveClass("cursor-row-resize");
});
