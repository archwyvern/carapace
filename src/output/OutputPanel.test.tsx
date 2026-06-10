import { render, screen } from "@testing-library/react";
import { OutputPanel } from "./OutputPanel";

test("renders each line", () => {
  render(
    <OutputPanel
      lines={[
        { id: 1, text: "hello" },
        { id: 2, text: "world" },
      ]}
    />,
  );
  expect(screen.getByText("hello")).toBeInTheDocument();
  expect(screen.getByText("world")).toBeInTheDocument();
});

test("applies the level class", () => {
  render(<OutputPanel lines={[{ id: 1, text: "boom", level: "error" }]} />);
  expect(screen.getByText("boom")).toHaveClass("text-error");
});

test("exposes a labelled log role", () => {
  render(<OutputPanel lines={[]} ariaLabel="Build" />);
  expect(screen.getByRole("log", { name: "Build" })).toBeInTheDocument();
});
