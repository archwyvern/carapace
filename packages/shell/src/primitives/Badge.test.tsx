import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

test("renders its content", () => {
  render(<Badge>NEW</Badge>);
  expect(screen.getByText("NEW")).toBeInTheDocument();
});

test("applies the tone class", () => {
  render(<Badge tone="error">ERR</Badge>);
  expect(screen.getByText("ERR")).toHaveClass("text-error");
});
