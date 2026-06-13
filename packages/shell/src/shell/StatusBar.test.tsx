import { render, screen } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

test("renders left content", () => {
  render(<StatusBar left={<span>LEFT</span>} />);
  expect(screen.getByText("LEFT")).toBeInTheDocument();
});

test("renders right content", () => {
  render(<StatusBar right={<span>RIGHT</span>} />);
  expect(screen.getByText("RIGHT")).toBeInTheDocument();
});
