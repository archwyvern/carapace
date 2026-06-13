import { render, screen } from "@testing-library/react";
import { SectionHeader } from "./SectionHeader";

test("renders its label", () => {
  render(<SectionHeader>Materials</SectionHeader>);
  expect(screen.getByText("Materials")).toBeInTheDocument();
});
